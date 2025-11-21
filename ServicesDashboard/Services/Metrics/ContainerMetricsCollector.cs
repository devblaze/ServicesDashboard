using Microsoft.EntityFrameworkCore;
using Renci.SshNet;
using ServicesDashboard.Data;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Servers;
using System.Text.RegularExpressions;
using System.Security.Cryptography;
using System.Text;

namespace ServicesDashboard.Services.Metrics;

public class ContainerMetricsCollector : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ContainerMetricsCollector> _logger;
    private readonly TimeSpan _collectionInterval = TimeSpan.FromSeconds(30);
    private readonly TimeSpan _retentionPeriod = TimeSpan.FromHours(24);

    public ContainerMetricsCollector(
        IServiceProvider serviceProvider,
        ILogger<ContainerMetricsCollector> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Container Metrics Collector started (interval: {Interval}s, retention: {Retention}h)",
            _collectionInterval.TotalSeconds, _retentionPeriod.TotalHours);

        // Wait a bit for the application to fully start
        await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CollectMetricsAsync(stoppingToken);
                await CleanupOldMetricsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Container Metrics Collector");
            }

            await Task.Delay(_collectionInterval, stoppingToken);
        }

        _logger.LogInformation("Container Metrics Collector stopped");
    }

    private async Task CollectMetricsAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();
        var connectionManager = scope.ServiceProvider.GetRequiredService<IServerConnectionManager>();

        // Get all online servers
        var servers = await context.ManagedServers
            .Where(s => s.Status == ServerStatus.Online)
            .ToListAsync(stoppingToken);

        if (servers.Count == 0)
        {
            return;
        }

        _logger.LogDebug("Collecting metrics from {Count} online servers", servers.Count);

        var timestamp = DateTime.UtcNow;
        var metricsToAdd = new List<ContainerMetricsHistory>();

        // Process servers in parallel with a limit
        var semaphore = new SemaphoreSlim(5); // Limit concurrent connections
        var tasks = servers.Select(async server =>
        {
            await semaphore.WaitAsync(stoppingToken);
            try
            {
                var serverMetrics = await CollectServerMetricsAsync(server, connectionManager, timestamp, stoppingToken);
                lock (metricsToAdd)
                {
                    metricsToAdd.AddRange(serverMetrics);
                }
            }
            finally
            {
                semaphore.Release();
            }
        });

        await Task.WhenAll(tasks);

        if (metricsToAdd.Count > 0)
        {
            context.ContainerMetricsHistory.AddRange(metricsToAdd);
            await context.SaveChangesAsync(stoppingToken);
            _logger.LogDebug("Collected {Count} container metrics from {ServerCount} servers",
                metricsToAdd.Count, servers.Count);
        }
    }

    private async Task<List<ContainerMetricsHistory>> CollectServerMetricsAsync(
        ManagedServer server,
        IServerConnectionManager connectionManager,
        DateTime timestamp,
        CancellationToken stoppingToken)
    {
        var metrics = new List<ContainerMetricsHistory>();

        try
        {
            // Create SSH client directly from ManagedServer data
            using var client = CreateSshClient(server);
            client.Connect();

            // Get all running containers with stats in one command
            var command = "docker stats --no-stream --format \"{{.ID}}|{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}|{{.NetIO}}|{{.BlockIO}}\"";
            using var cmd = client.CreateCommand(command);
            cmd.CommandTimeout = TimeSpan.FromSeconds(30);
            var result = await Task.Run(() => cmd.Execute(), stoppingToken);

            client.Disconnect();

            foreach (var line in result.Split('\n', StringSplitOptions.RemoveEmptyEntries))
            {
                var parts = line.Split('|');
                if (parts.Length >= 7)
                {
                    try
                    {
                        var (memUsage, memLimit) = ParseMemoryUsage(parts[3]);
                        var (netRx, netTx) = ParseNetworkIO(parts[5]);
                        var (blockRead, blockWrite) = ParseBlockIO(parts[6]);

                        metrics.Add(new ContainerMetricsHistory
                        {
                            ServerId = server.Id,
                            ContainerId = parts[0],
                            ContainerName = parts[1],
                            Timestamp = timestamp,
                            CpuPercentage = ParsePercentage(parts[2]),
                            MemoryUsageBytes = memUsage,
                            MemoryLimitBytes = memLimit,
                            MemoryPercentage = ParsePercentage(parts[4]),
                            NetworkRxBytes = netRx,
                            NetworkTxBytes = netTx,
                            BlockReadBytes = blockRead,
                            BlockWriteBytes = blockWrite
                        });
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to parse stats for container {ContainerId} on server {ServerName}",
                            parts[0], server.Name);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to collect metrics from server {ServerName} ({ServerId})",
                server.Name, server.Id);
        }

        return metrics;
    }

    private async Task CleanupOldMetricsAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();

        var cutoff = DateTime.UtcNow - _retentionPeriod;
        var deleted = await context.ContainerMetricsHistory
            .Where(m => m.Timestamp < cutoff)
            .ExecuteDeleteAsync(stoppingToken);

        if (deleted > 0)
        {
            _logger.LogDebug("Cleaned up {Count} old metrics records", deleted);
        }
    }

    private SshClient CreateSshClient(ManagedServer server)
    {
        var plainPassword = DecryptPassword(server.EncryptedPassword ?? "");
        var host = server.HostAddress;
        var port = server.SshPort ?? 22;
        var username = server.Username ?? "root";

        // Check if using SSH key authentication
        if (!string.IsNullOrEmpty(server.SshKeyPath) && File.Exists(server.SshKeyPath))
        {
            var keyFile = new PrivateKeyFile(server.SshKeyPath);
            return new SshClient(host, port, username, keyFile);
        }
        else
        {
            // Use password authentication
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
            // Simple Base64 decoding - matches ServerManagement implementation
            var bytes = Convert.FromBase64String(encryptedPassword);
            return Encoding.UTF8.GetString(bytes);
        }
        catch
        {
            // If decryption fails, return empty string
            return string.Empty;
        }
    }

    private float ParsePercentage(string percentageStr)
    {
        if (float.TryParse(percentageStr.Replace("%", "").Trim(), out var percentage))
        {
            return percentage;
        }
        return 0;
    }

    private (long usage, long limit) ParseMemoryUsage(string memoryStr)
    {
        // Format: "1.5GiB / 8GiB" or "500MiB / 2GiB"
        var parts = memoryStr.Split('/');
        if (parts.Length >= 2)
        {
            return (ParseSizeToBytes(parts[0].Trim()), ParseSizeToBytes(parts[1].Trim()));
        }
        return (0, 0);
    }

    private (long rx, long tx) ParseNetworkIO(string networkStr)
    {
        // Format: "10.5MB / 20MB"
        var parts = networkStr.Split('/');
        if (parts.Length >= 2)
        {
            return (ParseSizeToBytes(parts[0].Trim()), ParseSizeToBytes(parts[1].Trim()));
        }
        return (0, 0);
    }

    private (long read, long write) ParseBlockIO(string blockStr)
    {
        // Format: "100MB / 50MB"
        var parts = blockStr.Split('/');
        if (parts.Length >= 2)
        {
            return (ParseSizeToBytes(parts[0].Trim()), ParseSizeToBytes(parts[1].Trim()));
        }
        return (0, 0);
    }

    private long ParseSizeToBytes(string sizeStr)
    {
        // Handle formats like: 1.5GiB, 500MiB, 100kB, 50B
        var match = Regex.Match(sizeStr, @"([\d.]+)\s*([A-Za-z]+)");
        if (!match.Success || !double.TryParse(match.Groups[1].Value, out var value))
        {
            return 0;
        }

        var unit = match.Groups[2].Value.ToUpperInvariant();
        return unit switch
        {
            "B" => (long)value,
            "KB" or "KIB" => (long)(value * 1024),
            "MB" or "MIB" => (long)(value * 1024 * 1024),
            "GB" or "GIB" => (long)(value * 1024 * 1024 * 1024),
            "TB" or "TIB" => (long)(value * 1024 * 1024 * 1024 * 1024),
            _ => (long)value
        };
    }
}
