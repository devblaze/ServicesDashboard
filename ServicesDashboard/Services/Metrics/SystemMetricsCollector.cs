using Microsoft.EntityFrameworkCore;
using Renci.SshNet;
using ServicesDashboard.Data;
using ServicesDashboard.Models;
using System.Text.RegularExpressions;
using System.Text;
using System.Collections.Concurrent;

namespace ServicesDashboard.Services.Metrics;

public class SystemMetricsCollector : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<SystemMetricsCollector> _logger;
    private readonly TimeSpan _collectionInterval = TimeSpan.FromSeconds(30);
    private readonly TimeSpan _retentionPeriod = TimeSpan.FromHours(24);

    // Cache previous network readings for rate calculation
    private readonly ConcurrentDictionary<string, (long rxBytes, long txBytes, DateTime timestamp)> _previousNetworkReadings = new();

    public SystemMetricsCollector(
        IServiceProvider serviceProvider,
        ILogger<SystemMetricsCollector> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("System Metrics Collector started (interval: {Interval}s, retention: {Retention}h)",
            _collectionInterval.TotalSeconds, _retentionPeriod.TotalHours);

        // Wait a bit for the application to fully start
        await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CollectMetricsAsync(stoppingToken);
                await CleanupOldMetricsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in System Metrics Collector");
            }

            await Task.Delay(_collectionInterval, stoppingToken);
        }

        _logger.LogInformation("System Metrics Collector stopped");
    }

    private async Task CollectMetricsAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();

        // Get all online servers
        var servers = await context.ManagedServers
            .Where(s => s.Status == ServerStatus.Online)
            .ToListAsync(stoppingToken);

        if (servers.Count == 0)
        {
            return;
        }

        _logger.LogDebug("Collecting system metrics from {Count} online servers", servers.Count);

        var timestamp = DateTime.UtcNow;

        // Process servers in parallel with a limit
        var semaphore = new SemaphoreSlim(5);
        var tasks = servers.Select(async server =>
        {
            await semaphore.WaitAsync(stoppingToken);
            try
            {
                await CollectServerSystemMetricsAsync(server, context, timestamp, stoppingToken);
            }
            finally
            {
                semaphore.Release();
            }
        });

        await Task.WhenAll(tasks);
        await context.SaveChangesAsync(stoppingToken);
    }

    private async Task CollectServerSystemMetricsAsync(
        ManagedServer server,
        ServicesDashboardContext context,
        DateTime timestamp,
        CancellationToken stoppingToken)
    {
        try
        {
            using var client = CreateSshClient(server);
            client.Connect();

            // Detect if this is Unraid
            var isUnraid = await DetectUnraidAsync(client, stoppingToken);
            _logger.LogDebug("Server {ServerName} detected as {Type}", server.Name, isUnraid ? "Unraid" : "Linux");

            // Collect network metrics
            var (systemMetrics, networkInterfaces) = await CollectNetworkMetricsAsync(client, server.Id, timestamp, stoppingToken);
            context.SystemMetricsHistory.Add(systemMetrics);
            context.NetworkInterfaceMetricsHistory.AddRange(networkInterfaces);

            // Collect temperature metrics and update system metrics
            var (cpuTemp, gpuTemp) = await CollectTemperatureMetricsAsync(client, stoppingToken);
            systemMetrics.CpuTemperature = cpuTemp;
            systemMetrics.GpuTemperature = gpuTemp;

            // Collect disk metrics
            var diskMetrics = isUnraid
                ? await CollectUnraidDiskMetricsAsync(client, server.Id, timestamp, stoppingToken)
                : await CollectLinuxDiskMetricsAsync(client, server.Id, timestamp, stoppingToken);
            context.DiskMetricsHistory.AddRange(diskMetrics);

            client.Disconnect();

            _logger.LogDebug("Collected system metrics from server {ServerName}: {DiskCount} disks, {InterfaceCount} interfaces",
                server.Name, diskMetrics.Count, networkInterfaces.Count);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to collect system metrics from server {ServerName} ({ServerId})",
                server.Name, server.Id);
        }
    }

    private async Task<bool> DetectUnraidAsync(SshClient client, CancellationToken stoppingToken)
    {
        try
        {
            using var cmd = client.CreateCommand("[ -f /etc/unraid-version ] && echo 'unraid' || echo 'linux'");
            cmd.CommandTimeout = TimeSpan.FromSeconds(10);
            var result = await Task.Run(() => cmd.Execute(), stoppingToken);
            return result.Trim().ToLower() == "unraid";
        }
        catch
        {
            return false;
        }
    }

    private async Task<(SystemMetricsHistory, List<NetworkInterfaceMetricsHistory>)> CollectNetworkMetricsAsync(
        SshClient client,
        int serverId,
        DateTime timestamp,
        CancellationToken stoppingToken)
    {
        var interfaces = new List<NetworkInterfaceMetricsHistory>();
        long totalRxBytes = 0;
        long totalTxBytes = 0;

        try
        {
            // Get network interface stats from /proc/net/dev
            var command = "cat /proc/net/dev | tail -n +3";
            using var cmd = client.CreateCommand(command);
            cmd.CommandTimeout = TimeSpan.FromSeconds(15);
            var result = await Task.Run(() => cmd.Execute(), stoppingToken);

            foreach (var line in result.Split('\n', StringSplitOptions.RemoveEmptyEntries))
            {
                var parts = line.Split(new[] { ' ', ':' }, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length < 10) continue;

                var interfaceName = parts[0];

                // Skip loopback
                if (interfaceName == "lo") continue;

                if (!long.TryParse(parts[1], out var rxBytes) ||
                    !long.TryParse(parts[9], out var txBytes))
                    continue;

                // Determine interface type
                var interfaceType = DetermineInterfaceType(interfaceName);

                // Calculate rate from previous reading
                var cacheKey = $"{serverId}_{interfaceName}";
                long rxBytesPerSec = 0;
                long txBytesPerSec = 0;

                if (_previousNetworkReadings.TryGetValue(cacheKey, out var previous))
                {
                    var timeDiff = (timestamp - previous.timestamp).TotalSeconds;
                    if (timeDiff > 0)
                    {
                        rxBytesPerSec = (long)((rxBytes - previous.rxBytes) / timeDiff);
                        txBytesPerSec = (long)((txBytes - previous.txBytes) / timeDiff);

                        // Handle counter wrap-around or reset
                        if (rxBytesPerSec < 0) rxBytesPerSec = 0;
                        if (txBytesPerSec < 0) txBytesPerSec = 0;
                    }
                }

                _previousNetworkReadings[cacheKey] = (rxBytes, txBytes, timestamp);

                interfaces.Add(new NetworkInterfaceMetricsHistory
                {
                    ServerId = serverId,
                    Timestamp = timestamp,
                    InterfaceName = interfaceName,
                    InterfaceType = interfaceType,
                    RxBytes = rxBytes,
                    TxBytes = txBytes,
                    RxBytesPerSec = rxBytesPerSec,
                    TxBytesPerSec = txBytesPerSec
                });

                // Only include physical and bridge interfaces in totals (not docker)
                if (interfaceType is "physical" or "bridge")
                {
                    totalRxBytes += rxBytes;
                    totalTxBytes += txBytes;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to collect network metrics");
        }

        // Calculate aggregate rate
        var aggregateCacheKey = $"{serverId}_aggregate";
        long aggregateRxPerSec = 0;
        long aggregateTxPerSec = 0;

        if (_previousNetworkReadings.TryGetValue(aggregateCacheKey, out var prevAggregate))
        {
            var timeDiff = (timestamp - prevAggregate.timestamp).TotalSeconds;
            if (timeDiff > 0)
            {
                aggregateRxPerSec = (long)((totalRxBytes - prevAggregate.rxBytes) / timeDiff);
                aggregateTxPerSec = (long)((totalTxBytes - prevAggregate.txBytes) / timeDiff);
                if (aggregateRxPerSec < 0) aggregateRxPerSec = 0;
                if (aggregateTxPerSec < 0) aggregateTxPerSec = 0;
            }
        }
        _previousNetworkReadings[aggregateCacheKey] = (totalRxBytes, totalTxBytes, timestamp);

        var systemMetrics = new SystemMetricsHistory
        {
            ServerId = serverId,
            Timestamp = timestamp,
            NetworkRxBytes = totalRxBytes,
            NetworkTxBytes = totalTxBytes,
            NetworkRxBytesPerSec = aggregateRxPerSec,
            NetworkTxBytesPerSec = aggregateTxPerSec
        };

        return (systemMetrics, interfaces);
    }

    private string DetermineInterfaceType(string interfaceName)
    {
        if (interfaceName.StartsWith("eth") || interfaceName.StartsWith("enp") || interfaceName.StartsWith("eno"))
            return "physical";
        if (interfaceName.StartsWith("br") || interfaceName.StartsWith("bond"))
            return "bridge";
        if (interfaceName.StartsWith("docker") || interfaceName.StartsWith("veth"))
            return "docker";
        if (interfaceName.StartsWith("wlan") || interfaceName.StartsWith("wlp"))
            return "wireless";
        return "virtual";
    }

    private async Task<(float?, float?)> CollectTemperatureMetricsAsync(
        SshClient client,
        CancellationToken stoppingToken)
    {
        float? cpuTemp = null;
        float? gpuTemp = null;

        try
        {
            // Try multiple methods to get CPU temperature
            var cpuTempCommands = new[]
            {
                // Method 1: thermal_zone (most common)
                "cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null",
                // Method 2: coretemp
                "cat /sys/devices/platform/coretemp.0/hwmon/hwmon*/temp1_input 2>/dev/null",
                // Method 3: sensors command
                "sensors 2>/dev/null | grep -m1 'Core 0' | awk '{print $3}' | sed 's/+//' | sed 's/°C//'"
            };

            foreach (var command in cpuTempCommands)
            {
                try
                {
                    using var cmd = client.CreateCommand(command);
                    cmd.CommandTimeout = TimeSpan.FromSeconds(10);
                    var result = await Task.Run(() => cmd.Execute(), stoppingToken);
                    var trimmed = result.Trim();

                    if (!string.IsNullOrEmpty(trimmed) && float.TryParse(trimmed, out var temp))
                    {
                        // thermal_zone and hwmon return millidegrees
                        cpuTemp = temp > 1000 ? temp / 1000 : temp;
                        break;
                    }
                }
                catch
                {
                    continue;
                }
            }

            // Try to get GPU temperature (NVIDIA)
            try
            {
                using var gpuCmd = client.CreateCommand("nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader,nounits 2>/dev/null | head -1");
                gpuCmd.CommandTimeout = TimeSpan.FromSeconds(10);
                var gpuResult = await Task.Run(() => gpuCmd.Execute(), stoppingToken);
                if (float.TryParse(gpuResult.Trim(), out var temp))
                {
                    gpuTemp = temp;
                }
            }
            catch
            {
                // NVIDIA GPU not available
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to collect temperature metrics");
        }

        return (cpuTemp, gpuTemp);
    }

    private async Task<List<DiskMetricsHistory>> CollectUnraidDiskMetricsAsync(
        SshClient client,
        int serverId,
        DateTime timestamp,
        CancellationToken stoppingToken)
    {
        var disks = new List<DiskMetricsHistory>();

        try
        {
            // Get disk info from Unraid's emhttp
            var command = @"
                # Get array disks
                for disk in /mnt/disk*; do
                    if [ -d ""$disk"" ]; then
                        name=$(basename $disk)
                        df_out=$(df -B1 $disk 2>/dev/null | tail -1)
                        if [ ! -z ""$df_out"" ]; then
                            total=$(echo $df_out | awk '{print $2}')
                            used=$(echo $df_out | awk '{print $3}')
                            free=$(echo $df_out | awk '{print $4}')
                            echo ""array|$name|$disk|$total|$used|$free""
                        fi
                    fi
                done

                # Get cache
                if [ -d ""/mnt/cache"" ]; then
                    df_out=$(df -B1 /mnt/cache 2>/dev/null | tail -1)
                    if [ ! -z ""$df_out"" ]; then
                        total=$(echo $df_out | awk '{print $2}')
                        used=$(echo $df_out | awk '{print $3}')
                        free=$(echo $df_out | awk '{print $4}')
                        echo ""cache|cache|/mnt/cache|$total|$used|$free""
                    fi
                fi

                # Get parity info from mdcmd if available
                if command -v mdcmd &> /dev/null; then
                    mdcmd status 2>/dev/null | grep -E '^rdevSize\.[0-9]+=' | while read line; do
                        idx=$(echo $line | sed 's/rdevSize\.\([0-9]*\)=.*/\1/')
                        size=$(echo $line | sed 's/.*=//')
                        echo ""parity|parity$idx||$size|0|$size""
                    done
                fi
            ";

            using var cmd = client.CreateCommand(command);
            cmd.CommandTimeout = TimeSpan.FromSeconds(30);
            var result = await Task.Run(() => cmd.Execute(), stoppingToken);

            foreach (var line in result.Split('\n', StringSplitOptions.RemoveEmptyEntries))
            {
                var parts = line.Split('|');
                if (parts.Length < 6) continue;

                var diskType = parts[0];
                var diskName = parts[1];
                var mountPoint = parts[2];

                if (!long.TryParse(parts[3], out var total) ||
                    !long.TryParse(parts[4], out var used) ||
                    !long.TryParse(parts[5], out var free))
                    continue;

                var usagePercentage = total > 0 ? (float)used / total * 100 : 0;

                disks.Add(new DiskMetricsHistory
                {
                    ServerId = serverId,
                    Timestamp = timestamp,
                    DiskName = diskName,
                    DiskType = diskType,
                    MountPoint = string.IsNullOrEmpty(mountPoint) ? null : mountPoint,
                    TotalBytes = total,
                    UsedBytes = used,
                    FreeBytes = free,
                    UsagePercentage = usagePercentage,
                    Status = "active"
                });
            }

            // Try to get disk temperatures
            await CollectDiskTemperaturesAsync(client, disks, stoppingToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to collect Unraid disk metrics");
        }

        // If no Unraid-specific disks found, fall back to generic Linux
        if (disks.Count == 0)
        {
            return await CollectLinuxDiskMetricsAsync(client, serverId, timestamp, stoppingToken);
        }

        return disks;
    }

    private async Task<List<DiskMetricsHistory>> CollectLinuxDiskMetricsAsync(
        SshClient client,
        int serverId,
        DateTime timestamp,
        CancellationToken stoppingToken)
    {
        var disks = new List<DiskMetricsHistory>();

        try
        {
            // Get mounted filesystems excluding virtual ones
            var command = "df -B1 -x tmpfs -x devtmpfs -x squashfs -x overlay 2>/dev/null | tail -n +2";
            using var cmd = client.CreateCommand(command);
            cmd.CommandTimeout = TimeSpan.FromSeconds(15);
            var result = await Task.Run(() => cmd.Execute(), stoppingToken);

            foreach (var line in result.Split('\n', StringSplitOptions.RemoveEmptyEntries))
            {
                var parts = line.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length < 6) continue;

                var device = parts[0];
                var mountPoint = parts[5];

                // Skip certain mount points
                if (mountPoint.StartsWith("/snap") || mountPoint.StartsWith("/boot/efi"))
                    continue;

                if (!long.TryParse(parts[1], out var total) ||
                    !long.TryParse(parts[2], out var used) ||
                    !long.TryParse(parts[3], out var free))
                    continue;

                var usagePercentage = total > 0 ? (float)used / total * 100 : 0;
                var diskName = mountPoint == "/" ? "root" : mountPoint.TrimStart('/').Replace('/', '_');
                var diskType = mountPoint == "/" ? "system" : "data";

                disks.Add(new DiskMetricsHistory
                {
                    ServerId = serverId,
                    Timestamp = timestamp,
                    DiskName = diskName,
                    DiskType = diskType,
                    MountPoint = mountPoint,
                    Device = device,
                    TotalBytes = total,
                    UsedBytes = used,
                    FreeBytes = free,
                    UsagePercentage = usagePercentage,
                    Status = "active"
                });
            }

            // Try to get disk temperatures
            await CollectDiskTemperaturesAsync(client, disks, stoppingToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to collect Linux disk metrics");
        }

        return disks;
    }

    private async Task CollectDiskTemperaturesAsync(
        SshClient client,
        List<DiskMetricsHistory> disks,
        CancellationToken stoppingToken)
    {
        try
        {
            // Try to get temperatures using smartctl
            var command = @"
                for dev in /dev/sd?; do
                    if [ -b ""$dev"" ]; then
                        temp=$(smartctl -A $dev 2>/dev/null | grep -i temperature | head -1 | awk '{print $NF}')
                        if [ ! -z ""$temp"" ]; then
                            echo ""$dev|$temp""
                        fi
                    fi
                done
            ";

            using var cmd = client.CreateCommand(command);
            cmd.CommandTimeout = TimeSpan.FromSeconds(30);
            var result = await Task.Run(() => cmd.Execute(), stoppingToken);

            var temperatures = new Dictionary<string, float>();
            foreach (var line in result.Split('\n', StringSplitOptions.RemoveEmptyEntries))
            {
                var parts = line.Split('|');
                if (parts.Length >= 2 && float.TryParse(parts[1], out var temp))
                {
                    temperatures[parts[0]] = temp;
                }
            }

            // Match temperatures to disks by device
            foreach (var disk in disks)
            {
                if (!string.IsNullOrEmpty(disk.Device) && temperatures.TryGetValue(disk.Device, out var temp))
                {
                    disk.Temperature = temp;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to collect disk temperatures (smartctl may not be available)");
        }
    }

    private async Task CleanupOldMetricsAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();

        var cutoff = DateTime.UtcNow - _retentionPeriod;

        var deletedSystem = await context.SystemMetricsHistory
            .Where(m => m.Timestamp < cutoff)
            .ExecuteDeleteAsync(stoppingToken);

        var deletedDisk = await context.DiskMetricsHistory
            .Where(m => m.Timestamp < cutoff)
            .ExecuteDeleteAsync(stoppingToken);

        var deletedNetwork = await context.NetworkInterfaceMetricsHistory
            .Where(m => m.Timestamp < cutoff)
            .ExecuteDeleteAsync(stoppingToken);

        var total = deletedSystem + deletedDisk + deletedNetwork;
        if (total > 0)
        {
            _logger.LogDebug("Cleaned up {Count} old system metrics records (system: {System}, disk: {Disk}, network: {Network})",
                total, deletedSystem, deletedDisk, deletedNetwork);
        }

        // Also cleanup stale cache entries
        var staleCutoff = DateTime.UtcNow.AddMinutes(-5);
        var staleKeys = _previousNetworkReadings
            .Where(kvp => kvp.Value.timestamp < staleCutoff)
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var key in staleKeys)
        {
            _previousNetworkReadings.TryRemove(key, out _);
        }
    }

    private SshClient CreateSshClient(ManagedServer server)
    {
        var plainPassword = DecryptPassword(server.EncryptedPassword ?? "");
        var host = server.HostAddress;
        var port = server.SshPort ?? 22;
        var username = server.Username ?? "root";

        if (!string.IsNullOrEmpty(server.SshKeyPath) && File.Exists(server.SshKeyPath))
        {
            var keyFile = new PrivateKeyFile(server.SshKeyPath);
            return new SshClient(host, port, username, keyFile);
        }
        else
        {
            var connectionInfo = new Renci.SshNet.ConnectionInfo(
                host,
                port,
                username,
                new PasswordAuthenticationMethod(username, plainPassword));

            connectionInfo.Timeout = TimeSpan.FromSeconds(30);
            return new SshClient(connectionInfo);
        }
    }

    private string DecryptPassword(string encryptedPassword)
    {
        if (string.IsNullOrEmpty(encryptedPassword))
        {
            return string.Empty;
        }

        try
        {
            var bytes = Convert.FromBase64String(encryptedPassword);
            return Encoding.UTF8.GetString(bytes);
        }
        catch
        {
            return string.Empty;
        }
    }
}
