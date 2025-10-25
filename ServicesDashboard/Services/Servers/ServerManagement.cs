using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using OllamaSharp;
using OllamaSharp.Models;
using Renci.SshNet;
using ServicesDashboard.Data;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Responses;
using ServicesDashboard.Models.Results;

namespace ServicesDashboard.Services.Servers;

public interface IServerManagementService
{
    Task<IEnumerable<ManagedServer>> GetServersAsync();
    Task<ManagedServer?> GetServerAsync(int id);
    Task<ManagedServer> AddServerAsync(ManagedServer server);
    Task<ManagedServer> UpdateServerAsync(ManagedServer server);
    Task<bool> DeleteServerAsync(int id);
    Task<ServerHealthCheck?> PerformHealthCheckAsync(int serverId);
    Task<UpdateReport?> CheckForUpdatesAsync(int serverId);
    Task<IEnumerable<ServerAlert>> GetActiveAlertsAsync(int? serverId = null);
    Task<bool> TestConnectionAsync(ManagedServer server);
    Task<bool> TestConnectionAsync(string hostAddress, int? sshPort, string? username, string? plainPassword);
    Task<bool> IsHostAddressAvailableAsync(string hostAddress);
    Task<string> GetServerLogsAsync(ManagedServer server, int? lines = 100);
    Task<LogAnalysisResult> AnalyzeLogsWithAiAsync(int serverId, string logs);
    Task<CommandResult> ExecuteCommandAsync(int serverId, string command);
    Task<bool> CleanupTerminalSessionAsync(int serverId);
    Task<TmuxAvailabilityResult> CheckTmuxAvailabilityAsync(int serverId);
    Task<bool> InstallTmuxAsync(int serverId);
    Task<SystemDiscoveryResult> PerformSystemDiscoveryAsync(ManagedServer server);
    Task<DockerServiceDiscoveryResult> DiscoverDockerServicesAsync(int serverId);
    Task<bool> StartDockerContainerAsync(int serverId, string containerId);
    Task<bool> StopDockerContainerAsync(int serverId, string containerId);
    Task<bool> RestartDockerContainerAsync(int serverId, string containerId);
    Task<DockerIpSyncResult> SyncDockerContainerIpsAsync(int serverId);
    Task<NetworkInterfacesSyncResult> SyncAllNetworkInterfacesAsync(int serverId);
    Task<BulkSyncResult> SyncAllServersAsync();
    Task<IpConflictCheckResult> CheckIpConflictAsync(string ipAddress, int? excludeDeviceId = null);
    Task<DockerNetworkMigrationAnalysis> AnalyzeDockerNetworksAsync(int serverId);
    Task<IpSuggestionResult> SuggestIpsForMigrationAsync(IpSuggestionRequest request);
}

public class ServerManagement : IServerManagementService
{
    private readonly ServicesDashboardContext _context;
    private readonly ILogger<ServerManagement> _logger;
    private readonly IOllamaApiClient _ollamaClient;
    private readonly AppSettings _settings;
    private readonly IpManagement.IIpManagementService? _ipManagementService;
    private readonly IServiceProvider _serviceProvider;

    public ServerManagement(
        ServicesDashboardContext context,
        ILogger<ServerManagement> logger,
        IOllamaApiClient ollamaClient,
        IOptions<AppSettings> settings,
        IServiceProvider serviceProvider,
        IpManagement.IIpManagementService? ipManagementService = null)
    {
        _context = context;
        _logger = logger;
        _ollamaClient = ollamaClient;
        _settings = settings.Value;
        _serviceProvider = serviceProvider;
        _ipManagementService = ipManagementService;
    }

    public async Task<IEnumerable<ManagedServer>> GetServersAsync()
    {
        return await _context.ManagedServers
            .Include(s => s.HealthChecks.OrderByDescending(h => h.CheckTime).Take(1))
            .Include(s => s.UpdateReports.OrderByDescending(u => u.ScanTime).Take(1))
            .Include(s => s.Alerts.Where(a => !a.IsResolved))
            .ToListAsync();
    }

    public async Task<ManagedServer?> GetServerAsync(int id)
    {
        return await _context.ManagedServers
            .Include(s => s.HealthChecks.OrderByDescending(h => h.CheckTime))
            .Include(s => s.UpdateReports.OrderByDescending(u => u.ScanTime))
            .Include(s => s.Alerts.OrderByDescending(a => a.CreatedAt))
            .FirstOrDefaultAsync(s => s.Id == id);
    }

    public async Task<ManagedServer> AddServerAsync(ManagedServer server)
    {
        server.CreatedAt = server.UpdatedAt = DateTime.UtcNow;

        // Check if server with same host address already exists
        var existingServer = await _context.ManagedServers
            .FirstOrDefaultAsync(s => s.HostAddress == server.HostAddress);

        if (existingServer != null)
        {
            throw new InvalidOperationException($"A server with host address '{server.HostAddress}' already exists.");
        }

        // Encrypt password if provided
        if (!string.IsNullOrEmpty(server.EncryptedPassword))
        {
            server.EncryptedPassword = EncryptPassword(server.EncryptedPassword);
        }

        // Test initial connection
        var connectionSuccess = await TestConnectionAsync(server);
        if (!connectionSuccess)
        {
            server.Status = ServerStatus.Offline;
            _logger.LogWarning("⚠️ Adding server {Name} even though initial connection test failed", server.Name);
        }

        _context.ManagedServers.Add(server);
        await _context.SaveChangesAsync();

        // Perform system discovery if connection was successful
        if (connectionSuccess)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    _logger.LogInformation("🔍 Starting system discovery for server {Name} (ID: {Id})", server.Name, server.Id);
                    var discoveryResult = await PerformSystemDiscoveryAsync(server);
                    
                    // Update server with discovered information
                    var serverToUpdate = await _context.ManagedServers.FindAsync(server.Id);
                    if (serverToUpdate != null)
                    {
                        serverToUpdate.OperatingSystem = discoveryResult.OperatingSystem;
                        serverToUpdate.SystemInfo = JsonSerializer.Serialize(discoveryResult);
                        serverToUpdate.UpdatedAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();
                        _logger.LogInformation("✅ System discovery completed for server {Name}", server.Name);
                    }

                    // Perform initial health check
                    await PerformHealthCheckAsync(server.Id);
                    
                    // Check for updates
                    await CheckForUpdatesAsync(server.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "❌ System discovery failed for server {Name} (ID: {Id})", server.Name, server.Id);
                }
            });
        }

        return server;
    }

    public async Task<SystemDiscoveryResult> PerformSystemDiscoveryAsync(ManagedServer server)
    {
        var discoveryResult = new SystemDiscoveryResult
        {
            DiscoveryTime = DateTime.UtcNow,
            Success = false
        };

        try
        {
            using var client = CreateSshClient(server);
            client.Connect();

            if (!client.IsConnected)
            {
                throw new Exception("Could not establish SSH connection for system discovery");
            }

            _logger.LogInformation("🔬 Performing system discovery on {HostAddress}", server.HostAddress);

            // Collect comprehensive system information
            var systemInfo = await CollectSystemInformationAsync(client);
            
            // Use AI to analyze and categorize the system information
            var aiAnalysis = await AnalyzeSystemInfoWithAiAsync(systemInfo);
            
            // Get update information
            var updateInfo = await GetUpdateInfoWithRetryAsync(client, aiAnalysis.OperatingSystem);

            // Populate discovery result
            discoveryResult.Success = true;
            discoveryResult.OperatingSystem = aiAnalysis.OperatingSystem;
            discoveryResult.OsVersion = aiAnalysis.OsVersion;
            discoveryResult.Architecture = aiAnalysis.Architecture;
            discoveryResult.KernelVersion = aiAnalysis.KernelVersion;
            discoveryResult.Hostname = aiAnalysis.Hostname;
            discoveryResult.SystemUptime = aiAnalysis.SystemUptime;
            discoveryResult.TotalMemory = aiAnalysis.TotalMemory;
            discoveryResult.AvailableUpdates = updateInfo.TotalUpdates;
            discoveryResult.SecurityUpdates = updateInfo.SecurityUpdates;
            discoveryResult.PackageManager = updateInfo.PackageManager;
            discoveryResult.InstalledPackages = aiAnalysis.InstalledPackages;
            discoveryResult.RunningServices = aiAnalysis.RunningServices;
            discoveryResult.NetworkInterfaces = aiAnalysis.NetworkInterfaces;
            discoveryResult.SystemLoad = aiAnalysis.SystemLoad;
            discoveryResult.DiskInfo = aiAnalysis.DiskInfo;
            discoveryResult.AiConfidence = aiAnalysis.Confidence;
            discoveryResult.RawSystemData = systemInfo;

            client.Disconnect();

            _logger.LogInformation("✅ System discovery completed for {HostAddress}. OS: {OS}, Updates: {Updates} ({SecurityUpdates} security)", 
                server.HostAddress, discoveryResult.OperatingSystem, discoveryResult.AvailableUpdates, discoveryResult.SecurityUpdates);

            return discoveryResult;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ System discovery failed for server {HostAddress}", server.HostAddress);
            discoveryResult.ErrorMessage = ex.Message;
            return discoveryResult;
        }
    }

    private async Task<Dictionary<string, string>> CollectSystemInformationAsync(SshClient client)
    {
        var systemInfo = new Dictionary<string, string>();
        
        // Define commands to gather comprehensive system information
        var commands = new Dictionary<string, string[]>
        {
            ["os_release"] = new[] { "cat /etc/os-release", "cat /etc/redhat-release", "cat /etc/debian_version", "uname -a" },
            ["hostname"] = new[] { "hostname", "hostnamectl" },
            ["uptime"] = new[] { "uptime", "cat /proc/uptime" },
            ["memory"] = new[] { "cat /proc/meminfo", "free -h", "free -m" },
            ["cpu"] = new[] { "cat /proc/cpuinfo", "nproc", "lscpu" },
            ["kernel"] = new[] { "uname -r", "uname -a" },
            ["architecture"] = new[] { "uname -m", "arch" },
            ["disk"] = new[] { "df -h", "lsblk", "cat /proc/mounts" },
            ["network"] = new[] { "ip addr show", "ifconfig", "cat /proc/net/dev" },
            ["services"] = new[] { "systemctl list-units --type=service --state=running", "service --status-all", "ps aux" },
            ["packages"] = new[] { "dpkg -l | wc -l", "rpm -qa | wc -l", "pacman -Q | wc -l" },
            ["updates"] = new[] { "apt list --upgradable 2>/dev/null | grep -v 'Listing'", "yum check-update", "dnf check-update" },
            ["load"] = new[] { "cat /proc/loadavg", "uptime" },
            ["users"] = new[] { "who", "w", "last -n 5" },
            ["environment"] = new[] { "env | grep -E '^(PATH|HOME|USER|SHELL)'" }
        };

        foreach (var category in commands)
        {
            foreach (var command in category.Value)
            {
                try
                {
                    var result = await ExecuteCommandAsync(client, command);
                    if (!string.IsNullOrWhiteSpace(result))
                    {
                        systemInfo[$"{category.Key}_{command.Replace(" ", "_").Replace("/", "_").Replace("|", "_")}"] = result;
                        break; // Use first successful command
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogDebug("Command failed: {Command} - {Error}", command, ex.Message);
                }
            }
        }

        return systemInfo;
    }

    private async Task<SystemAiAnalysisResult> AnalyzeSystemInfoWithAiAsync(Dictionary<string, string> systemInfo)
    {
        try
        {
            var systemData = string.Join("\n", systemInfo.Select(kv => $"{kv.Key}: {kv.Value}"));
            
            var prompt = $@"
Analyze the following Linux/Unix system information and extract key details:

{systemData}

Please respond with a JSON object containing the following information:
{{
  ""operatingSystem"": ""Ubuntu 20.04.3 LTS"",
  ""osVersion"": ""20.04.3"",
  ""architecture"": ""x86_64"",
  ""kernelVersion"": ""5.4.0-84-generic"",
  ""hostname"": ""webserver-01"",
  ""systemUptime"": ""7 days, 12 hours"",
  ""totalMemory"": ""8GB"",
  ""installedPackages"": 1250,
  ""runningServices"": [""ssh"", ""nginx"", ""mysql""],
  ""networkInterfaces"": [""eth0: 192.168.1.100"", ""lo: 127.0.0.1""],
  ""systemLoad"": ""0.85, 0.92, 1.02"",
  ""diskInfo"": [""/ 45G used of 100G (45%)"", ""/home 12G used of 50G (24%)""],
  ""confidence"": 0.95
}}

If some information cannot be determined, use null or reasonable defaults. Focus on accuracy and provide a confidence score based on data quality.";

            var response = new StringBuilder();
            await foreach (var chunk in _ollamaClient.GenerateAsync(new GenerateRequest
                           {
                               Model = _settings.Ollama.Model,
                               Prompt = prompt,
                               Stream = false
                           }))
            {
                if (chunk?.Response != null)
                    response.Append(chunk.Response);
            }

            var responseText = response.ToString();
            
            // Extract JSON from response
            var jsonMatch = Regex.Match(responseText, @"\{.*\}", RegexOptions.Singleline);
            if (jsonMatch.Success)
            {
                var analysis = JsonSerializer.Deserialize<SystemAiAnalysisResult>(jsonMatch.Value, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                
                if (analysis != null)
                {
                    return analysis;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI analysis of system information failed");
        }

        // Fallback analysis using basic parsing
        return ParseSystemInfoManually(systemInfo);
    }

    private SystemAiAnalysisResult ParseSystemInfoManually(Dictionary<string, string> systemInfo)
    {
        var analysis = new SystemAiAnalysisResult { Confidence = 0.6 };

        // Extract OS info
        var osRelease = systemInfo.FirstOrDefault(kv => kv.Key.Contains("os_release") && kv.Value.Contains("PRETTY_NAME"));
        if (!osRelease.Equals(default(KeyValuePair<string, string>)))
        {
            var match = Regex.Match(osRelease.Value, @"PRETTY_NAME=""([^""]+)""");
            if (match.Success)
            {
                analysis.OperatingSystem = match.Groups[1].Value;
            }
        }

        // Extract hostname
        var hostname = systemInfo.FirstOrDefault(kv => kv.Key.Contains("hostname"));
        if (!hostname.Equals(default(KeyValuePair<string, string>)))
        {
            analysis.Hostname = hostname.Value.Split('\n')[0].Trim();
        }

        // Extract kernel
        var uname = systemInfo.FirstOrDefault(kv => kv.Key.Contains("kernel") && kv.Value.Contains("Linux"));
        if (!uname.Equals(default(KeyValuePair<string, string>)))
        {
            var parts = uname.Value.Split(' ');
            if (parts.Length > 2)
            {
                analysis.KernelVersion = parts[2];
                analysis.Architecture = parts.LastOrDefault() ?? "unknown";
            }
        }

        return analysis;
    }

    private async Task<UpdateInfoResult> GetUpdateInfoWithRetryAsync(SshClient client, string? operatingSystem)
    {
        var updateInfo = new UpdateInfoResult();
        
        // Commands to try based on common package managers
        var updateCommands = new Dictionary<string, (string CheckCommand, string CountCommand)>
        {
            ["apt"] = ("which apt", "apt list --upgradable 2>/dev/null | grep -c upgradable"),
            ["yum"] = ("which yum", "yum check-update -q 2>/dev/null | wc -l"),
            ["dnf"] = ("which dnf", "dnf check-update -q 2>/dev/null | wc -l"),
            ["zypper"] = ("which zypper", "zypper list-updates | wc -l"),
            ["pacman"] = ("which pacman", "pacman -Qu | wc -l"),
            ["apk"] = ("which apk", "apk list -u 2>/dev/null | wc -l")
        };

        foreach (var packageManager in updateCommands)
        {
            try
            {
                // Check if package manager exists
                var checkResult = await ExecuteCommandAsync(client, packageManager.Value.CheckCommand);
                if (string.IsNullOrWhiteSpace(checkResult) || checkResult.Contains("not found"))
                    continue;

                updateInfo.PackageManager = packageManager.Key;
                
                // Get update count
                var countResult = await ExecuteCommandAsync(client, packageManager.Value.CountCommand);
                if (int.TryParse(countResult.Trim(), out var updates))
                {
                    updateInfo.TotalUpdates = Math.Max(0, updates);
                }

                // Try to get security updates for apt-based systems
                if (packageManager.Key == "apt")
                {
                    try
                    {
                        var securityUpdates = await ExecuteCommandAsync(client, "apt list --upgradable 2>/dev/null | grep -i security | wc -l");
                        if (int.TryParse(securityUpdates.Trim(), out var secCount))
                        {
                            updateInfo.SecurityUpdates = secCount;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogDebug("Could not get security update count: {Error}", ex.Message);
                    }
                }

                break; // Found working package manager
            }
            catch (Exception ex)
            {
                _logger.LogDebug("Package manager {PM} check failed: {Error}", packageManager.Key, ex.Message);
            }
        }

        return updateInfo;
    }

    // Keep existing methods unchanged...
    public async Task<ManagedServer> UpdateServerAsync(ManagedServer server)
    {
        server.UpdatedAt = DateTime.UtcNow;

        var existingServer = await _context.ManagedServers.FindAsync(server.Id);
        if (existingServer == null)
            throw new ArgumentException("Server not found");

        // Update properties
        existingServer.Name = server.Name;
        existingServer.HostAddress = server.HostAddress;
        existingServer.SshPort = server.SshPort;
        existingServer.Username = server.Username;
        existingServer.Type = server.Type;
        existingServer.Group = server.Group;
        existingServer.Tags = server.Tags;
        existingServer.ParentServerId = server.ParentServerId;
        existingServer.UpdatedAt = server.UpdatedAt;

        // Handle password update
        if (!string.IsNullOrEmpty(server.EncryptedPassword) &&
            server.EncryptedPassword != existingServer.EncryptedPassword)
        {
            existingServer.EncryptedPassword = EncryptPassword(server.EncryptedPassword);
        }

        await _context.SaveChangesAsync();
        return existingServer;
    }

    public async Task<bool> DeleteServerAsync(int id)
    {
        var server = await _context.ManagedServers.FindAsync(id);
        if (server == null)
            return false;

        _context.ManagedServers.Remove(server);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> TestConnectionAsync(ManagedServer server)
    {
        var plainPassword = DecryptPassword(server.EncryptedPassword ?? "");
        return await TestConnectionAsync(
            server.HostAddress,
            server.SshPort,
            server.Username,
            plainPassword
        );
    }

    public async Task<bool> TestConnectionAsync(string hostAddress, int? sshPort, string? username,
        string? plainPassword)
    {
        try
        {
            _logger.LogInformation("🔍 Testing connection to {HostAddress}:{Port} with user {Username}",
                hostAddress, sshPort ?? 22, username ?? "root");

            var connectionInfo = new Renci.SshNet.ConnectionInfo(
                hostAddress,
                sshPort ?? 22,
                username ?? "root",
                new PasswordAuthenticationMethod(username ?? "root", plainPassword ?? ""));

            connectionInfo.Timeout = TimeSpan.FromSeconds(30);

            using var client = new SshClient(connectionInfo);

            _logger.LogDebug("⏱️ Attempting SSH connection with 30s timeout...");
            client.Connect();

            var result = client.IsConnected;

            if (result)
            {
                _logger.LogInformation("✅ Successfully connected to {HostAddress}", hostAddress);

                // Test a simple command to ensure SSH is working properly
                try
                {
                    var testResult = await ExecuteCommandAsync(client, "whoami");
                    _logger.LogDebug("🧪 Test command result: {Result}", testResult);
                }
                catch (Exception cmdEx)
                {
                    _logger.LogWarning(cmdEx, "⚠️ Connection established but command execution failed");
                }
            }
            else
            {
                _logger.LogWarning("❌ Failed to establish connection to {HostAddress}", hostAddress);
            }

            client.Disconnect();
            _logger.LogDebug("🔌 Disconnected from {HostAddress}", hostAddress);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Connection test failed for {HostAddress}:{Port}. Error: {ErrorMessage}",
                hostAddress, sshPort ?? 22, ex.Message);

            // Log specific SSH errors
            if (ex.Message.Contains("Authentication", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogError("🔐 Authentication failed - check username/password");
            }
            else if (ex.Message.Contains("Connection refused", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogError("🚫 Connection refused - check if SSH service is running and port is correct");
            }
            else if (ex.Message.Contains("timeout", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogError("⏰ Connection timeout - check network connectivity and firewall settings");
            }
            else if (ex.Message.Contains("No route to host", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogError("🌐 Network unreachable - check IP address and routing");
            }

            return false;
        }
    }

    public async Task<ServerHealthCheck?> PerformHealthCheckAsync(int serverId)
    {
        var server = await _context.ManagedServers.FindAsync(serverId);
        if (server == null)
            return null;

        var healthCheck = new ServerHealthCheck
        {
            ServerId = serverId,
            CheckTime = DateTime.UtcNow
        };

        try
        {
            using var client = CreateSshClient(server);
            client.Connect();

            if (client.IsConnected)
            {
                // Get system metrics
                var metrics = await GetSystemMetricsAsync(client);

                healthCheck.IsHealthy = true;
                healthCheck.CpuUsage = metrics.CpuUsage;
                healthCheck.MemoryUsage = metrics.MemoryUsage;
                healthCheck.DiskUsage = metrics.DiskUsage;
                healthCheck.LoadAverage = metrics.LoadAverage;
                healthCheck.RunningProcesses = metrics.RunningProcesses;
                healthCheck.RawData = JsonSerializer.Serialize(metrics);

                // Update server status
                server.Status = DetermineServerStatus(metrics);
                server.LastCheckTime = DateTime.UtcNow;
                server.OperatingSystem = metrics.OperatingSystem;

                // Create alerts if necessary
                await CreateAlertsIfNeeded(server, metrics);
            }
            else
            {
                throw new Exception("Could not establish SSH connection");
            }

            client.Disconnect();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Health check failed for server {ServerId}", serverId);

            healthCheck.IsHealthy = false;
            healthCheck.ErrorMessage = ex.Message;

            server.Status = ServerStatus.Offline;
            server.LastCheckTime = DateTime.UtcNow;

            // Create connection lost alert
            await CreateAlert(server, AlertType.ConnectionLost, AlertSeverity.High,
                $"Connection to server failed: {ex.Message}");
        }

        _context.ServerHealthChecks.Add(healthCheck);
        await _context.SaveChangesAsync();

        return healthCheck;
    }

    public async Task<UpdateReport?> CheckForUpdatesAsync(int serverId)
    {
        var server = await _context.ManagedServers.FindAsync(serverId);
        if (server == null)
            return null;

        var updateReport = new UpdateReport
        {
            ServerId = serverId,
            ScanTime = DateTime.UtcNow
        };

        try
        {
            using var client = CreateSshClient(server);
            client.Connect();

            if (client.IsConnected)
            {
                var updateInfo = await GetUpdateInfoWithRetryAsync(client, server.OperatingSystem);

                updateReport.AvailableUpdates = updateInfo.TotalUpdates;
                updateReport.SecurityUpdates = updateInfo.SecurityUpdates;
                updateReport.PackageDetails = JsonSerializer.Serialize(updateInfo.Packages);
                updateReport.Status = UpdateStatus.Pending;

                // Get AI recommendation if updates are available
                if (updateInfo.TotalUpdates > 0)
                {
                    var aiAnalysis = await GetAiUpdateRecommendation(server, updateInfo);
                    updateReport.AiRecommendation = aiAnalysis.Recommendation;
                    updateReport.AiConfidence = aiAnalysis.Confidence;

                    // Create alert for available updates
                    await CreateAlert(server, AlertType.UpdatesAvailable,
                        updateInfo.SecurityUpdates > 0 ? AlertSeverity.High : AlertSeverity.Medium,
                        string.Format(CultureInfo.InvariantCulture, "{0} updates available ({1} security)",
                            updateInfo.TotalUpdates, updateInfo.SecurityUpdates));
                }
            }

            client.Disconnect();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Update check failed for server {ServerId}", serverId);
            updateReport.Status = UpdateStatus.Failed;
        }

        _context.UpdateReports.Add(updateReport);
        await _context.SaveChangesAsync();

        return updateReport;
    }

    public async Task<IEnumerable<ServerAlert>> GetActiveAlertsAsync(int? serverId = null)
    {
        try
        {
            var query = _context.ServerAlerts
                .Where(a => !a.IsResolved);

            if (serverId.HasValue)
            {
                query = query.Where(a => a.ServerId == serverId.Value);
            }

            var alerts = await query
                .Include(a => a.Server)
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();

            return alerts;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting active alerts for serverId: {ServerId}", serverId);
            return new List<ServerAlert>();
        }
    }

    public async Task<bool> IsHostAddressAvailableAsync(string hostAddress)
    {
        var existingServer = await _context.ManagedServers
            .FirstOrDefaultAsync(s => s.HostAddress == hostAddress);

        return existingServer == null;
    }

    public async Task<string> GetServerLogsAsync(ManagedServer server, int? lines = 100)
    {
        try
        {
            using var client = CreateSshClient(server);
            client.Connect();

            if (!client.IsConnected)
                throw new Exception("Could not establish SSH connection");

            // Get system logs (journalctl for systemd systems, /var/log/messages for others)
            var logCommands = new[]
            {
                $"journalctl -n {lines ?? 100} --no-pager",
                $"tail -n {lines ?? 100} /var/log/messages",
                $"tail -n {lines ?? 100} /var/log/syslog"
            };

            string logs = "";
            foreach (var cmd in logCommands)
            {
                try
                {
                    logs = await ExecuteCommandAsync(client, cmd);
                    if (!string.IsNullOrWhiteSpace(logs))
                        break;
                }
                catch (Exception ex)
                {
                    throw new Exception("Could not get server logs", ex);
                }
            }

            client.Disconnect();
            return logs;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get logs for server {server.Id}", server.Id);
            throw;
        }
    }

    public async Task<LogAnalysisResult> AnalyzeLogsWithAiAsync(int serverId, string logs)
    {
        var server = await _context.ManagedServers.FindAsync(serverId);
        if (server == null)
            throw new ArgumentException("Server not found");

        return new LogAnalysisResult();
    }

    public async Task<CommandResult> ExecuteCommandAsync(int serverId, string command)
    {
        var server = await _context.ManagedServers.FindAsync(serverId);
        if (server == null)
            throw new ArgumentException("Server not found");

        var result = new CommandResult
        {
            ExecutedAt = DateTime.UtcNow
        };

        try
        {
            using var client = CreateSshClient(server);
            client.Connect();

            if (!client.IsConnected)
                throw new Exception("Could not establish SSH connection");

            // Generate unique session name based on server ID
            var sessionName = $"servicesdashboard_{serverId}";

            // Check if tmux session exists, create if not
            var checkSessionCmd = client.CreateCommand($"tmux has-session -t {sessionName} 2>/dev/null; echo $?");
            var checkResult = checkSessionCmd.Execute().Trim();

            if (checkResult != "0")
            {
                // Session doesn't exist, create it
                var createCmd = client.CreateCommand($"tmux new-session -d -s {sessionName}");
                createCmd.Execute();
                _logger.LogInformation("Created new tmux session {SessionName} for server {ServerId}", sessionName, serverId);
            }

            // Execute command in the tmux session
            // Clear pane first to get only current command output
            var clearCmd = client.CreateCommand($"tmux send-keys -t {sessionName} 'clear' C-m");
            clearCmd.Execute();
            Thread.Sleep(100); // Small delay for clear to complete

            // Send the actual command
            var sendCmd = client.CreateCommand($"tmux send-keys -t {sessionName} '{command.Replace("'", "'\\''")}' C-m");
            sendCmd.Execute();

            // Wait a bit for command to execute
            Thread.Sleep(500);

            // Capture the pane output
            var captureCmd = client.CreateCommand($"tmux capture-pane -t {sessionName} -p");
            var output = captureCmd.Execute();

            result.Output = output ?? "";
            result.Error = "";
            result.ExitCode = 0;

            client.Disconnect();
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to execute command on server {ServerId}: {Command}", serverId, command);
            result.Error = ex.Message;
            result.ExitCode = -1;
            return result;
        }
    }

    public async Task<bool> CleanupTerminalSessionAsync(int serverId)
    {
        try
        {
            var server = await _context.ManagedServers.FindAsync(serverId);
            if (server == null)
                return false;

            using var client = CreateSshClient(server);
            client.Connect();

            if (!client.IsConnected)
                return false;

            var sessionName = $"servicesdashboard_{serverId}";

            // Kill the tmux session
            var killCmd = client.CreateCommand($"tmux kill-session -t {sessionName} 2>/dev/null");
            killCmd.Execute();

            client.Disconnect();
            _logger.LogInformation("Cleaned up tmux session {SessionName} for server {ServerId}", sessionName, serverId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cleanup terminal session for server {ServerId}", serverId);
            return false;
        }
    }

    public async Task<TmuxAvailabilityResult> CheckTmuxAvailabilityAsync(int serverId)
    {
        try
        {
            var server = await _context.ManagedServers.FindAsync(serverId);
            if (server == null)
                throw new ArgumentException("Server not found");

            using var client = CreateSshClient(server);
            client.Connect();

            if (!client.IsConnected)
                throw new Exception("Could not establish SSH connection");

            // Check if tmux is available
            var checkCmd = client.CreateCommand("command -v tmux >/dev/null 2>&1; echo $?");
            var checkResult = checkCmd.Execute().Trim();

            if (checkResult == "0")
            {
                // Get tmux version
                var versionCmd = client.CreateCommand("tmux -V");
                var version = versionCmd.Execute().Trim();

                client.Disconnect();
                return new TmuxAvailabilityResult
                {
                    IsAvailable = true,
                    Version = version,
                    Message = "tmux is installed and ready to use"
                };
            }

            client.Disconnect();
            return new TmuxAvailabilityResult
            {
                IsAvailable = false,
                Message = "tmux is not installed on this server"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to check tmux availability for server {ServerId}", serverId);
            return new TmuxAvailabilityResult
            {
                IsAvailable = false,
                Message = $"Error checking tmux: {ex.Message}"
            };
        }
    }

    public async Task<bool> InstallTmuxAsync(int serverId)
    {
        ManagedServer? server = null;
        string osId = "unknown";
        string lastCommand = "";
        string lastOutput = "";

        try
        {
            server = await _context.ManagedServers.FindAsync(serverId);
            if (server == null)
                return false;

            using var client = CreateSshClient(server);
            client.Connect();

            if (!client.IsConnected)
                return false;

            // Detect OS
            var osCheckCmd = client.CreateCommand("cat /etc/os-release 2>/dev/null | grep -E '^ID=' | cut -d'=' -f2 | tr -d '\"'");
            osId = osCheckCmd.Execute().Trim().ToLower();

            // Determine installation commands (try without sudo first, then with sudo)
            var installCommands = GetTmuxInstallCommands(osId);

            _logger.LogInformation("Installing tmux on server {ServerId} (OS: {OsId})", serverId, osId);

            bool installSuccess = false;

            // Try each command until one succeeds
            foreach (var installCommand in installCommands)
            {
                lastCommand = installCommand;
                _logger.LogInformation("Trying: {Command}", installCommand);

                var installCmd = client.CreateCommand(installCommand);
                installCmd.CommandTimeout = TimeSpan.FromMinutes(5);
                lastOutput = installCmd.Execute();

                var exitStatus = installCmd.ExitStatus;

                _logger.LogInformation("Exit status: {Status}, Output: {Output}", exitStatus, lastOutput);

                // Verify installation after each attempt
                var verifyCmd = client.CreateCommand("command -v tmux >/dev/null 2>&1; echo $?");
                var verifyResult = verifyCmd.Execute().Trim();

                if (verifyResult == "0")
                {
                    installSuccess = true;
                    _logger.LogInformation("✅ Successfully installed tmux on server {ServerId} using: {Command}", serverId, installCommand);
                    break;
                }
            }

            client.Disconnect();

            if (!installSuccess)
            {
                // Installation failed - analyze with AI
                await AnalyzeInstallationFailureAsync(serverId, osId, lastCommand, lastOutput, server.Name);
            }

            return installSuccess;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to install tmux on server {ServerId}", serverId);

            // Analyze error with AI
            await AnalyzeInstallationFailureAsync(serverId, osId, lastCommand, ex.Message, server?.Name ?? "Unknown");

            return false;
        }
    }

    private List<string> GetTmuxInstallCommands(string osId)
    {
        var commands = new List<string>();

        if (osId.Contains("ubuntu") || osId.Contains("debian"))
        {
            // Try without sudo first (in case user has passwordless access or is root)
            commands.Add("apt-get update && apt-get install -y tmux");
            commands.Add("sudo -n apt-get update && sudo -n apt-get install -y tmux"); // -n = non-interactive
            commands.Add("sudo apt-get update && sudo apt-get install -y tmux"); // May prompt for password
        }
        else if (osId.Contains("centos") || osId.Contains("rhel") || osId.Contains("fedora"))
        {
            commands.Add("yum install -y tmux || dnf install -y tmux");
            commands.Add("sudo -n yum install -y tmux || sudo -n dnf install -y tmux");
            commands.Add("sudo yum install -y tmux || sudo dnf install -y tmux");
        }
        else if (osId.Contains("arch"))
        {
            commands.Add("pacman -Sy --noconfirm tmux");
            commands.Add("sudo -n pacman -Sy --noconfirm tmux");
            commands.Add("sudo pacman -Sy --noconfirm tmux");
        }
        else if (osId.Contains("alpine"))
        {
            commands.Add("apk add --no-cache tmux");
            commands.Add("sudo -n apk add --no-cache tmux");
            commands.Add("sudo apk add --no-cache tmux");
        }
        else
        {
            // Default to apt-get
            _logger.LogWarning("Unknown OS type: {OsId}, trying apt-get", osId);
            commands.Add("apt-get update && apt-get install -y tmux");
            commands.Add("sudo -n apt-get update && sudo -n apt-get install -y tmux");
            commands.Add("sudo apt-get update && sudo apt-get install -y tmux");
        }

        return commands;
    }

    private async Task AnalyzeInstallationFailureAsync(int serverId, string osId, string command, string output, string serverName)
    {
        try
        {
            // Lazy load the AI service to avoid circular dependencies
            var aiService = _serviceProvider.GetService<AI.IAIErrorAnalysisService>();
            if (aiService == null)
            {
                _logger.LogWarning("AI Error Analysis Service not available");
                return;
            }

            var errorContext = new ErrorContext
            {
                Operation = $"Install tmux on {serverName}",
                ErrorMessage = "Failed to install tmux",
                CommandExecuted = command,
                CommandOutput = output,
                ServerOs = osId,
                ServerId = serverId,
                AdditionalContext = new Dictionary<string, string>
                {
                    ["Package"] = "tmux",
                    ["Suggestion"] = "Configure passwordless sudo for package installation commands"
                }
            };

            // This will log the AI analysis automatically
            await aiService.CreateErrorNotificationAsync(errorContext);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to analyze tmux installation error with AI");
        }
    }

    public async Task<DockerServiceDiscoveryResult> DiscoverDockerServicesAsync(int serverId)
    {
        var server = await GetServerAsync(serverId);
        if (server == null)
        {
            return new DockerServiceDiscoveryResult
            {
                Success = false,
                ErrorMessage = "Server not found"
            };
        }

        try
        {
            using var client = CreateSshClient(server);
            client.Connect();

            var dockerServices = await GetDockerServicesAsync(client, server.HostAddress);

            return new DockerServiceDiscoveryResult
            {
                Services = dockerServices,
                Success = true
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to discover Docker services for server {ServerId}", serverId);
            return new DockerServiceDiscoveryResult
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    public async Task<bool> StartDockerContainerAsync(int serverId, string containerId)
    {
        try
        {
            var server = await GetServerAsync(serverId);
            if (server == null) return false;

            var command = $"docker start {containerId}";
            var result = await ExecuteCommandAsync(serverId, command);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start Docker container {ContainerId} on server {ServerId}", containerId, serverId);
            return false;
        }
    }

    public async Task<bool> StopDockerContainerAsync(int serverId, string containerId)
    {
        try
        {
            var server = await GetServerAsync(serverId);
            if (server == null) return false;

            var command = $"docker stop {containerId}";
            var result = await ExecuteCommandAsync(serverId, command);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to stop Docker container {ContainerId} on server {ServerId}", containerId, serverId);
            return false;
        }
    }

    public async Task<bool> RestartDockerContainerAsync(int serverId, string containerId)
    {
        try
        {
            var server = await GetServerAsync(serverId);
            if (server == null) return false;

            var command = $"docker restart {containerId}";
            var result = await ExecuteCommandAsync(serverId, command);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to restart Docker container {ContainerId} on server {ServerId}", containerId, serverId);
            return false;
        }
    }

    public async Task<DockerIpSyncResult> SyncDockerContainerIpsAsync(int serverId)
    {
        var result = new DockerIpSyncResult
        {
            Success = false
        };

        try
        {
            // Check if IP Management service is available
            if (_ipManagementService == null)
            {
                result.ErrorMessage = "IP Management service is not available";
                return result;
            }

            var server = await GetServerAsync(serverId);
            if (server == null)
            {
                result.ErrorMessage = "Server not found";
                return result;
            }

            // Discover all Docker containers on this server
            var discoveryResult = await DiscoverDockerServicesAsync(serverId);
            if (!discoveryResult.Success)
            {
                result.ErrorMessage = discoveryResult.ErrorMessage;
                return result;
            }

            result.TotalContainersScanned = discoveryResult.Services.Count;

            // Process each container's network configuration
            foreach (var container in discoveryResult.Services)
            {
                if (container.Networks == null || !container.Networks.Any())
                {
                    _logger.LogDebug("Container {ContainerName} has no network configuration", container.Name);
                    continue;
                }

                foreach (var network in container.Networks)
                {
                    // Skip if no IP address is assigned
                    if (string.IsNullOrEmpty(network.IpAddress))
                    {
                        continue;
                    }

                    // Check if device already exists by MAC or IP
                    NetworkDevice? existingDevice = null;

                    if (!string.IsNullOrEmpty(network.MacAddress))
                    {
                        existingDevice = await _ipManagementService.FindDeviceByMacAsync(network.MacAddress);
                    }

                    if (existingDevice == null)
                    {
                        existingDevice = await _ipManagementService.GetDeviceByIpAsync(network.IpAddress);
                    }

                    var deviceType = DetermineDeviceType(container);

                    if (existingDevice != null)
                    {
                        // Update existing device
                        existingDevice.IpAddress = network.IpAddress;
                        existingDevice.MacAddress = network.MacAddress ?? existingDevice.MacAddress;
                        existingDevice.Hostname = container.Name;
                        existingDevice.DeviceType = deviceType;
                        existingDevice.Status = container.Status.Contains("Up") ? DeviceStatus.Online : DeviceStatus.Offline;
                        existingDevice.LastSeen = DateTime.UtcNow;
                        existingDevice.ManagedServerId = serverId;
                        existingDevice.IsStaticIp = true; // Docker containers typically have static IPs on custom networks
                        existingDevice.IsDhcpAssigned = false;
                        existingDevice.Source = DiscoverySource.Docker;

                        // Add notes about the container
                        existingDevice.Notes = $"Docker Container: {container.Image}\nNetwork: {network.NetworkName}\nMode: {container.NetworkMode}";

                        // Store open ports as JSON
                        if (container.Ports.Any())
                        {
                            var ports = container.Ports.Select(p => p.ContainerPort).ToList();
                            existingDevice.OpenPorts = JsonSerializer.Serialize(ports);
                        }

                        await _ipManagementService.CreateOrUpdateDeviceAsync(existingDevice);
                        result.DevicesUpdated++;
                    }
                    else
                    {
                        // Create new device
                        var newDevice = new NetworkDevice
                        {
                            IpAddress = network.IpAddress,
                            MacAddress = network.MacAddress,
                            Hostname = container.Name,
                            DeviceType = deviceType,
                            Status = container.Status.Contains("Up") ? DeviceStatus.Online : DeviceStatus.Offline,
                            FirstSeen = DateTime.UtcNow,
                            LastSeen = DateTime.UtcNow,
                            ManagedServerId = serverId,
                            IsStaticIp = true,
                            IsDhcpAssigned = false,
                            Source = DiscoverySource.Docker,
                            Notes = $"Docker Container: {container.Image}\nNetwork: {network.NetworkName}\nMode: {container.NetworkMode}",
                            Vendor = "Docker Container"
                        };

                        // Store open ports
                        if (container.Ports.Any())
                        {
                            var ports = container.Ports.Select(p => p.ContainerPort).ToList();
                            newDevice.OpenPorts = JsonSerializer.Serialize(ports);
                        }

                        // Try to find the subnet this IP belongs to
                        var allSubnets = await _ipManagementService.GetAllSubnetsAsync();
                        foreach (var subnet in allSubnets)
                        {
                            if (IsIpInSubnet(network.IpAddress, subnet.Network))
                            {
                                newDevice.SubnetId = subnet.Id;
                                break;
                            }
                        }

                        await _ipManagementService.CreateOrUpdateDeviceAsync(newDevice);
                        result.DevicesCreated++;
                    }

                    result.SyncedContainers.Add($"{container.Name} ({network.IpAddress})");
                }
            }

            result.Success = true;
            _logger.LogInformation(
                "Successfully synced Docker IPs for server {ServerId}: {Created} created, {Updated} updated",
                serverId, result.DevicesCreated, result.DevicesUpdated);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to sync Docker container IPs for server {ServerId}", serverId);
            result.ErrorMessage = ex.Message;
        }

        return result;
    }

    private DeviceType DetermineDeviceType(DockerService container)
    {
        var imageLower = container.Image.ToLowerInvariant();

        if (imageLower.Contains("database") || imageLower.Contains("postgres") ||
            imageLower.Contains("mysql") || imageLower.Contains("mongo") ||
            imageLower.Contains("redis"))
        {
            return DeviceType.Server;
        }

        if (imageLower.Contains("iot") || imageLower.Contains("homeassistant") ||
            imageLower.Contains("mqtt"))
        {
            return DeviceType.IoT;
        }

        if (imageLower.Contains("router") || imageLower.Contains("network"))
        {
            return DeviceType.NetworkDevice;
        }

        // Default to server for other containers
        return DeviceType.Server;
    }

    private bool IsIpInSubnet(string ipAddress, string cidrNotation)
    {
        try
        {
            var parts = cidrNotation.Split('/');
            if (parts.Length != 2) return false;

            var networkAddress = parts[0];
            var prefixLength = int.Parse(parts[1]);

            var ipBytes = System.Net.IPAddress.Parse(ipAddress).GetAddressBytes();
            var networkBytes = System.Net.IPAddress.Parse(networkAddress).GetAddressBytes();

            if (ipBytes.Length != networkBytes.Length) return false;

            var maskBytes = prefixLength / 8;
            var remainingBits = prefixLength % 8;

            // Check full bytes
            for (int i = 0; i < maskBytes; i++)
            {
                if (ipBytes[i] != networkBytes[i])
                    return false;
            }

            // Check remaining bits
            if (remainingBits > 0)
            {
                var mask = (byte)(0xFF << (8 - remainingBits));
                if ((ipBytes[maskBytes] & mask) != (networkBytes[maskBytes] & mask))
                    return false;
            }

            return true;
        }
        catch
        {
            return false;
        }
    }

    private async Task<List<DockerService>> GetDockerServicesAsync(SshClient client, string hostAddress)
    {
        var services = new List<DockerService>();

        try
        {
            // Check if Docker is available
            var dockerVersion = await ExecuteCommandAsync(client, "docker --version");
            if (string.IsNullOrEmpty(dockerVersion) || dockerVersion.Contains("command not found"))
            {
                _logger.LogWarning("Docker not found on the server");
                return services;
            }

            // Get all containers (running and stopped) with detailed info
            // Note: We exclude Labels from the format string because they can contain commas and break parsing
            var dockerPsCommand =
                "docker ps -a --format \"table {{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}|{{.CreatedAt}}\" --no-trunc";
            var dockerPsOutput = await ExecuteCommandAsync(client, dockerPsCommand);

            if (string.IsNullOrEmpty(dockerPsOutput))
            {
                return services;
            }

            var lines = dockerPsOutput.Split('\n', StringSplitOptions.RemoveEmptyEntries);

            // Skip header line
            for (int i = 1; i < lines.Length; i++)
            {
                var line = lines[i].Trim();
                if (string.IsNullOrEmpty(line)) continue;

                var parts = line.Split('|');
                if (parts.Length >= 6)
                {
                    var containerId = parts[0].Trim();
                    var containerName = parts[1].Trim();
                    var image = parts[2].Trim();
                    var status = parts[3].Trim();
                    var ports = parts[4].Trim();
                    var createdAt = parts[5].Trim();

                    var dockerService = new DockerService
                    {
                        ContainerId = containerId,
                        Name = containerName,
                        Image = image,
                        Status = status,
                        CreatedAt = ParseDockerDate(createdAt),
                        Ports = ParseDockerPorts(ports),
                        Labels = new Dictionary<string, string>() // Will be populated by GetContainerLabelsAsync if needed
                    };

                    // Get environment variables for the container (optional, only if needed)
                    // dockerService.Environment = await GetContainerEnvironmentAsync(client, containerId);

                    // Get labels for the container (using docker inspect to avoid parsing issues)
                    dockerService.Labels = await GetContainerLabelsAsync(client, containerId);

                    // Get network configuration for the container
                    dockerService.Networks = await GetContainerNetworkConfigAsync(client, containerId);

                    // Get network mode and MAC address
                    var networkModeCmd = $"docker inspect {containerId} --format '{{{{.HostConfig.NetworkMode}}}}'";
                    dockerService.NetworkMode = await ExecuteCommandAsync(client, networkModeCmd);

                    var macAddressCmd = $"docker inspect {containerId} --format '{{{{.NetworkSettings.MacAddress}}}}'";
                    dockerService.MacAddress = await ExecuteCommandAsync(client, macAddressCmd);

                    // Try to determine if it's a web service and extract description
                    await EnhanceDockerServiceInfoAsync(client, dockerService, hostAddress);

                    services.Add(dockerService);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting Docker services");
        }

        return services;
    }

    private async Task<Dictionary<string, string>> GetContainerLabelsAsync(SshClient client, string containerId)
    {
        var labels = new Dictionary<string, string>();

        try
        {
            // Use docker inspect to get labels in JSON format - this is safe from parsing issues
            var inspectCommand = $"docker inspect {containerId} --format '{{{{json .Config.Labels}}}}'";
            var labelsJson = await ExecuteCommandAsync(client, inspectCommand);

            if (!string.IsNullOrEmpty(labelsJson))
            {
                // Parse JSON to dictionary
                var labelsDict = JsonSerializer.Deserialize<Dictionary<string, string>>(labelsJson, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (labelsDict != null)
                {
                    return labelsDict;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get labels for container {ContainerId}", containerId);
        }

        return labels;
    }

    private async Task<Dictionary<string, string>> GetContainerEnvironmentAsync(SshClient client, string containerId)
    {
        var environment = new Dictionary<string, string>();

        try
        {
            var envCommand = $"docker inspect {containerId} --format '{{{{range .Config.Env}}}}{{{{.}}}}|{{{{end}}}}'";
            var envOutput = await ExecuteCommandAsync(client, envCommand);

            if (!string.IsNullOrEmpty(envOutput))
            {
                var envVars = envOutput.Split('|', StringSplitOptions.RemoveEmptyEntries);
                foreach (var envVar in envVars)
                {
                    var parts = envVar.Split('=', 2);
                    if (parts.Length == 2)
                    {
                        environment[parts[0]] = parts[1];
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get environment for container {ContainerId}", containerId);
        }

        return environment;
    }

    private async Task<List<DockerNetworkConfig>> GetContainerNetworkConfigAsync(SshClient client, string containerId)
    {
        var networks = new List<DockerNetworkConfig>();

        try
        {
            // Get network settings using docker inspect
            var networkCommand = $"docker inspect {containerId} --format '{{{{json .NetworkSettings}}}}'";
            var networkJson = await ExecuteCommandAsync(client, networkCommand);

            if (!string.IsNullOrEmpty(networkJson))
            {
                using var jsonDoc = JsonDocument.Parse(networkJson);
                var root = jsonDoc.RootElement;

                // Get NetworkMode
                if (root.TryGetProperty("NetworkMode", out var networkModeElement))
                {
                    // This will be populated in the calling method
                }

                // Get MacAddress
                if (root.TryGetProperty("MacAddress", out var macAddressElement))
                {
                    // This will be populated in the calling method
                }

                // Get Networks object (contains all network connections)
                if (root.TryGetProperty("Networks", out var networksElement) &&
                    networksElement.ValueKind == JsonValueKind.Object)
                {
                    foreach (var network in networksElement.EnumerateObject())
                    {
                        var config = new DockerNetworkConfig
                        {
                            NetworkName = network.Name
                        };

                        var networkValue = network.Value;

                        if (networkValue.TryGetProperty("IPAddress", out var ipElement))
                        {
                            config.IpAddress = ipElement.GetString();
                        }

                        if (networkValue.TryGetProperty("Gateway", out var gatewayElement))
                        {
                            config.Gateway = gatewayElement.GetString();
                        }

                        if (networkValue.TryGetProperty("MacAddress", out var macElement))
                        {
                            config.MacAddress = macElement.GetString();
                        }

                        if (networkValue.TryGetProperty("NetworkID", out var networkIdElement))
                        {
                            config.NetworkId = networkIdElement.GetString();
                        }

                        // Get subnet from IPPrefixLen and Gateway
                        if (networkValue.TryGetProperty("IPPrefixLen", out var prefixElement) &&
                            config.Gateway != null)
                        {
                            var prefixLen = prefixElement.GetInt32();
                            // Extract network address from gateway
                            var gatewayParts = config.Gateway.Split('.');
                            if (gatewayParts.Length == 4)
                            {
                                config.Subnet = $"{gatewayParts[0]}.{gatewayParts[1]}.{gatewayParts[2]}.0/{prefixLen}";
                            }
                        }

                        // Only add if it has an IP address
                        if (!string.IsNullOrEmpty(config.IpAddress))
                        {
                            networks.Add(config);
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get network config for container {ContainerId}", containerId);
        }

        return networks;
    }

    private async Task EnhanceDockerServiceInfoAsync(SshClient client, DockerService service, string hostAddress)
    {
        // Check if it's likely a web service based on common ports
        var webPorts = new[] { 80, 443, 8080, 3000, 5000, 8000, 9000 };
        var hasWebPort = service.Ports.Any(p => p.HostPort.HasValue && webPorts.Contains(p.HostPort.Value));

        if (hasWebPort)
        {
            service.IsWebService = true;
            var webPort = service.Ports.FirstOrDefault(p => p.HostPort.HasValue && webPorts.Contains(p.HostPort.Value));
            if (webPort != null)
            {
                var protocol = webPort.HostPort == 443 ? "https" : "http";
                service.ServiceUrl = $"{protocol}://{hostAddress}:{webPort.HostPort}";
            }
        }

        // Try to get description from labels
        service.Description = ExtractDescriptionFromLabels(service.Labels) ??
                              ExtractDescriptionFromImage(service.Image) ??
                              $"Docker container running {service.Image}";
    }

    private string? ExtractDescriptionFromLabels(Dictionary<string, string> labels)
    {
        // Common label keys for description
        var descriptionKeys = new[]
            { "description", "org.label-schema.description", "org.opencontainers.image.description" };

        foreach (var key in descriptionKeys)
        {
            if (labels.TryGetValue(key, out var description) && !string.IsNullOrEmpty(description))
            {
                return description;
            }
        }

        return null;
    }

    private string? ExtractDescriptionFromImage(string image)
    {
        // Extract service name from image
        var parts = image.Split(':', '/');
        var serviceName = parts.LastOrDefault(p => !string.IsNullOrEmpty(p) && !p.Contains("latest"));

        if (!string.IsNullOrEmpty(serviceName))
        {
            return $"Container running {serviceName}";
        }

        return null;
    }

    private List<DockerPort> ParseDockerPorts(string portsString)
    {
        var ports = new List<DockerPort>();

        if (string.IsNullOrEmpty(portsString)) return ports;

        // Parse port mappings like "0.0.0.0:8080->80/tcp, 0.0.0.0:8443->443/tcp"
        var portMappings = portsString.Split(',', StringSplitOptions.RemoveEmptyEntries);

        foreach (var mapping in portMappings)
        {
            var trimmed = mapping.Trim();
            if (string.IsNullOrEmpty(trimmed)) continue;

            try
            {
                // Handle formats like "0.0.0.0:8080->80/tcp" or "80/tcp"
                if (trimmed.Contains("->"))
                {
                    var parts = trimmed.Split("->");
                    if (parts.Length == 2)
                    {
                        var hostPart = parts[0].Trim();
                        var containerPart = parts[1].Trim();

                        // Parse host part (e.g., "0.0.0.0:8080" or "8080")
                        var hostPort = 0;
                        var hostIp = "";

                        if (hostPart.Contains(':'))
                        {
                            var hostParts = hostPart.Split(':');
                            hostIp = hostParts[0];
                            int.TryParse(hostParts[1], out hostPort);
                        }
                        else
                        {
                            int.TryParse(hostPart, out hostPort);
                        }

                        // Parse container part (e.g., "80/tcp")
                        var containerPortStr = containerPart.Split('/')[0];
                        if (int.TryParse(containerPortStr, out var containerPort))
                        {
                            var protocol = containerPart.Contains("/") ? containerPart.Split('/')[1] : "tcp";

                            ports.Add(new DockerPort
                            {
                                ContainerPort = containerPort,
                                HostPort = hostPort > 0 ? hostPort : null,
                                Protocol = protocol,
                                HostIp = !string.IsNullOrEmpty(hostIp) ? hostIp : null
                            });
                        }
                    }
                }
                else
                {
                    // Handle exposed ports without host mapping (e.g., "80/tcp")
                    var containerPortStr = trimmed.Split('/')[0];
                    if (int.TryParse(containerPortStr, out var containerPort))
                    {
                        var protocol = trimmed.Contains("/") ? trimmed.Split('/')[1] : "tcp";

                        ports.Add(new DockerPort
                        {
                            ContainerPort = containerPort,
                            Protocol = protocol
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse port mapping: {Mapping}", trimmed);
            }
        }

        return ports;
    }

    private Dictionary<string, string> ParseDockerLabels(string labelsString)
    {
        var labels = new Dictionary<string, string>();

        if (string.IsNullOrEmpty(labelsString)) return labels;

        try
        {
            // Labels are typically comma-separated key=value pairs
            var labelPairs = labelsString.Split(',', StringSplitOptions.RemoveEmptyEntries);

            foreach (var pair in labelPairs)
            {
                var parts = pair.Split('=', 2);
                if (parts.Length == 2)
                {
                    labels[parts[0].Trim()] = parts[1].Trim();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse Docker labels: {Labels}", labelsString);
        }

        return labels;
    }

    private DateTime ParseDockerDate(string dateString)
    {
        if (DateTime.TryParse(dateString, out var result))
        {
            return result;
        }

        return DateTime.UtcNow;
    }
    
    // Private helper methods
    private SshClient CreateSshClient(ManagedServer server)
    {
        var plainPassword = DecryptPassword(server.EncryptedPassword ?? "");
        var connectionInfo = new Renci.SshNet.ConnectionInfo(
            server.HostAddress,
            server.SshPort ?? 22,
            server.Username ?? "root",
            new PasswordAuthenticationMethod(server.Username ?? "root", plainPassword));

        connectionInfo.Timeout = TimeSpan.FromSeconds(30);
        return new SshClient(connectionInfo);
    }

    private async Task<SystemMetricsResult> GetSystemMetricsAsync(SshClient client)
    {
        var metrics = new SystemMetricsResult();

        try
        {
            // CPU Usage - simplified approach
            var cpuResult = await ExecuteCommandAsync(client,
                "grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$3+$4+$5)} END {print usage}'");
            if (double.TryParse(cpuResult, NumberStyles.Float, CultureInfo.InvariantCulture, out var cpu))
                metrics.CpuUsage = cpu;

            // Memory Usage
            var memResult =
                await ExecuteCommandAsync(client, "free | grep Mem | awk '{printf \"%.1f\", $3/$2 * 100.0}'");
            if (double.TryParse(memResult, NumberStyles.Float, CultureInfo.InvariantCulture, out var mem))
                metrics.MemoryUsage = mem;

            // Disk Usage
            var diskResult = await ExecuteCommandAsync(client, "df -h / | awk 'NR==2{print $5}' | sed 's/%//'");
            if (double.TryParse(diskResult, NumberStyles.Float, CultureInfo.InvariantCulture, out var disk))
                metrics.DiskUsage = disk;

            // Load Average
            var loadResult = await ExecuteCommandAsync(client,
                "uptime | awk -F'load average:' '{print $2}' | cut -d, -f1 | xargs");
            if (double.TryParse(loadResult, NumberStyles.Float, CultureInfo.InvariantCulture, out var load))
                metrics.LoadAverage = load;

            // Running Processes
            var procResult = await ExecuteCommandAsync(client, "ps aux | wc -l");
            if (int.TryParse(procResult, NumberStyles.Integer, CultureInfo.InvariantCulture, out var proc))
                metrics.RunningProcesses = proc - 1; // Subtract header line

            // OS Info
            var osResult = await ExecuteCommandAsync(client, "cat /etc/os-release | grep PRETTY_NAME | cut -d'\"' -f2");
            metrics.OperatingSystem = string.IsNullOrWhiteSpace(osResult) ? "Unknown" : osResult;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get some system metrics");
        }

        return metrics;
    }

    private async Task<string> ExecuteCommandAsync(SshClient client, string commandText)
    {
        return await Task.Run(() =>
        {
            using var command = client.CreateCommand(commandText);
            var result = command.Execute();
            return result?.Trim() ?? "";
        });
    }

    private async Task<UpdateInfoResult> GetUpdateInfoAsync(SshClient client, string? osType)
    {
        var updateInfo = new UpdateInfoResult();

        try
        {
            // Detect package manager and get update info
            if (osType?.ToLower().Contains("ubuntu") == true || osType?.ToLower().Contains("debian") == true)
            {
                // Update package lists first (non-interactive)
                await ExecuteCommandAsync(client, "DEBIAN_FRONTEND=noninteractive apt-get update -qq");

                var updatesResult = await ExecuteCommandAsync(client,
                    "apt list --upgradable 2>/dev/null | grep -v 'Listing...' | wc -l");
                if (int.TryParse(updatesResult, NumberStyles.Integer, CultureInfo.InvariantCulture,
                        out var totalUpdates))
                    updateInfo.TotalUpdates = totalUpdates;

                var securityResult = await ExecuteCommandAsync(client,
                    "apt list --upgradable 2>/dev/null | grep -i security | wc -l");
                if (int.TryParse(securityResult, NumberStyles.Integer, CultureInfo.InvariantCulture,
                        out var secUpdates))
                    updateInfo.SecurityUpdates = secUpdates;
            }
            else if (osType?.ToLower().Contains("centos") == true || osType?.ToLower().Contains("rhel") == true ||
                     osType?.ToLower().Contains("fedora") == true)
            {
                var updatesResult =
                    await ExecuteCommandAsync(client, "yum check-update -q | grep -v 'Loaded plugins' | wc -l");
                if (int.TryParse(updatesResult, NumberStyles.Integer, CultureInfo.InvariantCulture,
                        out var totalUpdates))
                    updateInfo.TotalUpdates = Math.Max(0, totalUpdates - 1); // Remove header if present
            }
            else
            {
                // Try generic approach for other distributions
                _logger.LogInformation("Unknown OS type {OsType}, using generic update check", osType);
                updateInfo.TotalUpdates = 0;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not get update information for OS: {OsType}", osType);
        }

        return updateInfo;
    }

    private ServerStatus DetermineServerStatus(SystemMetricsResult metricsResult)
    {
        if (metricsResult.CpuUsage > 90 || metricsResult.MemoryUsage > 90 || metricsResult.DiskUsage > 95)
            return ServerStatus.Critical;

        if (metricsResult.CpuUsage > 80 || metricsResult.MemoryUsage > 80 || metricsResult.DiskUsage > 90)
            return ServerStatus.Warning;

        return ServerStatus.Online;
    }

    private async Task CreateAlertsIfNeeded(ManagedServer server, SystemMetricsResult metricsResult)
    {
        // High CPU alert
        if (metricsResult.CpuUsage > 85)
        {
            await CreateAlert(server, AlertType.HighCpuUsage,
                metricsResult.CpuUsage > 95 ? AlertSeverity.Critical : AlertSeverity.High,
                string.Format(CultureInfo.InvariantCulture, "CPU usage is {0:F1}%", metricsResult.CpuUsage));
        }

        // High Memory alert
        if (metricsResult.MemoryUsage > 85)
        {
            await CreateAlert(server, AlertType.HighMemoryUsage,
                metricsResult.MemoryUsage > 95 ? AlertSeverity.Critical : AlertSeverity.High,
                string.Format(CultureInfo.InvariantCulture, "Memory usage is {0:F1}%", metricsResult.MemoryUsage));
        }

        // High Disk alert
        if (metricsResult.DiskUsage > 85)
        {
            await CreateAlert(server, AlertType.HighDiskUsage,
                metricsResult.DiskUsage > 95 ? AlertSeverity.Critical : AlertSeverity.High,
                string.Format(CultureInfo.InvariantCulture, "Disk usage is {0:F1}%", metricsResult.DiskUsage));
        }
    }

    private async Task CreateAlert(ManagedServer server, AlertType type, AlertSeverity severity, string message)
    {
        // Check if similar alert already exists
        var existingAlert = await _context.ServerAlerts
            .Where(a => a.ServerId == server.Id && a.Type == type && !a.IsResolved)
            .FirstOrDefaultAsync();

        if (existingAlert != null)
            return; // Don't create duplicate alerts

        var alert = new ServerAlert
        {
            ServerId = server.Id,
            Type = type,
            Severity = severity,
            Message = message,
            CreatedAt = DateTime.UtcNow
        };

        _context.ServerAlerts.Add(alert);
    }

    private async Task<(string Recommendation, double Confidence)> GetAiUpdateRecommendation(ManagedServer server,
        UpdateInfoResult updateInfoResult)
    {
        try
        {
            var prompt = string.Format(CultureInfo.InvariantCulture, @"
Server: {0} ({1})
Operating System: {2}
Available Updates: {3}
Security Updates: {4}

Please provide a brief recommendation for applying these updates. Consider:
1. Security implications
2. Update priority
3. Best practices for timing
4. Risk assessment

Respond with a JSON object containing 'recommendation' and 'confidence' (0-1).
Example: {{""recommendation"": ""Apply security updates immediately, schedule others for maintenance window"", ""confidence"": 0.8}}
",
                server.Name, server.Type, server.OperatingSystem, updateInfoResult.TotalUpdates,
                updateInfoResult.SecurityUpdates);

            var response = new StringBuilder();
            await foreach (var chunk in _ollamaClient.GenerateAsync(new GenerateRequest
                           {
                               Model = _settings.Ollama.Model,
                               Prompt = prompt,
                               Stream = false
                           }))
            {
                if (chunk?.Response != null)
                    response.Append(chunk.Response);
            }

            // Parse AI response
            var responseText = response.ToString();
            if (!string.IsNullOrWhiteSpace(responseText))
            {
                var aiResponse = JsonSerializer.Deserialize<AiUpdateResponse>(responseText);
                return (aiResponse?.Recommendation ?? "Apply updates during maintenance window",
                    aiResponse?.Confidence ?? 0.7);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get AI recommendation");
        }

        // Fallback recommendation
        var fallbackRecommendation = updateInfoResult.SecurityUpdates > 0
            ? string.Format(CultureInfo.InvariantCulture,
                "Apply {0} security updates immediately, schedule remaining {1} updates for maintenance window",
                updateInfoResult.SecurityUpdates, updateInfoResult.TotalUpdates - updateInfoResult.SecurityUpdates)
            : string.Format(CultureInfo.InvariantCulture, "Schedule {0} updates for next maintenance window",
                updateInfoResult.TotalUpdates);

        return (fallbackRecommendation, 0.5);
    }

    private string EncryptPassword(string password)
    {
        if (string.IsNullOrEmpty(password))
            return "";

        try
        {
            // Simple Base64 encoding for demo - in production use proper encryption
            return Convert.ToBase64String(Encoding.UTF8.GetBytes(password));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to encrypt password");
            return password; // Return as-is if encryption fails
        }
    }

    private string DecryptPassword(string encryptedPassword)
    {
        if (string.IsNullOrEmpty(encryptedPassword))
            return "";

        try
        {
            // Try to decode as Base64 first
            return Encoding.UTF8.GetString(Convert.FromBase64String(encryptedPassword));
        }
        catch (FormatException)
        {
            // If it's not valid Base64, assume it's already plain text
            _logger.LogDebug("Password appears to be plain text, using as-is");
            return encryptedPassword;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to decrypt password, using as plain text");
            return encryptedPassword;
        }
    }

    public async Task<NetworkInterfacesSyncResult> SyncAllNetworkInterfacesAsync(int serverId)
    {
        var result = new NetworkInterfacesSyncResult
        {
            Success = false,
            ServerId = serverId
        };

        try
        {
            if (_ipManagementService == null)
            {
                result.ErrorMessage = "IP Management service is not available";
                return result;
            }

            var server = await GetServerAsync(serverId);
            if (server == null)
            {
                result.ErrorMessage = "Server not found";
                return result;
            }

            using var client = CreateSshClient(server);
            client.Connect();

            if (!client.IsConnected)
            {
                result.ErrorMessage = "Could not establish SSH connection";
                return result;
            }

            _logger.LogInformation("🔍 Syncing all network interfaces for server {ServerName} (ID: {ServerId})",
                server.Name, serverId);

            // Sync Docker containers
            var dockerResult = await SyncDockerContainerIpsAsync(serverId);
            result.DockerContainersSynced = dockerResult.DevicesCreated + dockerResult.DevicesUpdated;

            // Sync VMs (libvirt/virsh for Unraid, Proxmox, etc.)
            var vmResult = await SyncVirtualMachinesAsync(client, server, serverId);
            result.VirtualMachinesSynced = vmResult.DevicesSynced;
            result.SyncDetails.AddRange(vmResult.Details);

            // Sync network interfaces (bridges, bonds, etc.)
            var interfaceResult = await SyncNetworkInterfacesAsync(client, server, serverId);
            result.NetworkInterfacesSynced = interfaceResult.DevicesSynced;
            result.SyncDetails.AddRange(interfaceResult.Details);

            result.Success = true;
            result.TotalDevicesSynced = result.DockerContainersSynced + result.VirtualMachinesSynced +
                                       result.NetworkInterfacesSynced;

            _logger.LogInformation(
                "✅ Successfully synced server {ServerName}: {Total} devices ({Docker} Docker, {VMs} VMs, {Interfaces} interfaces)",
                server.Name, result.TotalDevicesSynced, result.DockerContainersSynced,
                result.VirtualMachinesSynced, result.NetworkInterfacesSynced);

            client.Disconnect();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to sync network interfaces for server {ServerId}", serverId);
            result.ErrorMessage = ex.Message;
        }

        return result;
    }

    private async Task<VmSyncResult> SyncVirtualMachinesAsync(SshClient client, ManagedServer server, int serverId)
    {
        var result = new VmSyncResult();

        try
        {
            // Check if virsh is available
            var virshCheck = await ExecuteCommandAsync(client, "command -v virsh >/dev/null 2>&1; echo $?");
            if (virshCheck.Trim() != "0")
            {
                _logger.LogDebug("virsh not available on server {ServerId}, skipping VM sync", serverId);
                return result;
            }

            // Get list of all VMs (running and stopped)
            var vmListCommand = "virsh list --all --name";
            var vmListOutput = await ExecuteCommandAsync(client, vmListCommand);

            if (string.IsNullOrEmpty(vmListOutput))
            {
                _logger.LogDebug("No VMs found on server {ServerId}", serverId);
                return result;
            }

            var vmNames = vmListOutput.Split('\n', StringSplitOptions.RemoveEmptyEntries)
                .Select(n => n.Trim())
                .Where(n => !string.IsNullOrEmpty(n))
                .ToList();

            foreach (var vmName in vmNames)
            {
                try
                {
                    // Get VM details including network interfaces
                    var vmInfoCommand = $"virsh domifaddr {vmName} --source agent 2>/dev/null || virsh domifaddr {vmName} 2>/dev/null";
                    var vmInfoOutput = await ExecuteCommandAsync(client, vmInfoCommand);

                    // Get VM state
                    var vmStateCommand = $"virsh domstate {vmName}";
                    var vmState = await ExecuteCommandAsync(client, vmStateCommand);
                    var isRunning = vmState.Trim().Equals("running", StringComparison.OrdinalIgnoreCase);

                    // Parse network interfaces from output
                    if (!string.IsNullOrEmpty(vmInfoOutput))
                    {
                        var lines = vmInfoOutput.Split('\n', StringSplitOptions.RemoveEmptyEntries).Skip(2); // Skip header

                        foreach (var line in lines)
                        {
                            var parts = line.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                            if (parts.Length >= 4)
                            {
                                var interfaceName = parts[0].Trim();
                                var macAddress = parts[1].Trim();
                                var ipWithMask = parts[3].Trim();

                                // Extract IP address (remove /24 or similar)
                                var ipAddress = ipWithMask.Split('/')[0];

                                if (!string.IsNullOrEmpty(ipAddress) &&
                                    System.Net.IPAddress.TryParse(ipAddress, out _))
                                {
                                    // Check if device already exists
                                    var existingDevice = await _ipManagementService!.FindDeviceByMacAsync(macAddress) ??
                                                        await _ipManagementService.GetDeviceByIpAsync(ipAddress);

                                    if (existingDevice != null)
                                    {
                                        // Update existing device
                                        existingDevice.IpAddress = ipAddress;
                                        existingDevice.MacAddress = macAddress;
                                        existingDevice.Hostname = vmName;
                                        existingDevice.DeviceType = DeviceType.VirtualMachine;
                                        existingDevice.Status = isRunning ? DeviceStatus.Online : DeviceStatus.Offline;
                                        existingDevice.LastSeen = DateTime.UtcNow;
                                        existingDevice.ManagedServerId = serverId;
                                        existingDevice.IsStaticIp = true;
                                        existingDevice.IsDhcpAssigned = false;
                                        existingDevice.Source = DiscoverySource.ManualEntry; // We'll use this for VM detection
                                        existingDevice.Notes = $"Virtual Machine on {server.Name}\nInterface: {interfaceName}";
                                        existingDevice.Vendor = "Virtual Machine";

                                        await _ipManagementService.CreateOrUpdateDeviceAsync(existingDevice);
                                    }
                                    else
                                    {
                                        // Create new device
                                        var newDevice = new NetworkDevice
                                        {
                                            IpAddress = ipAddress,
                                            MacAddress = macAddress,
                                            Hostname = vmName,
                                            DeviceType = DeviceType.VirtualMachine,
                                            Status = isRunning ? DeviceStatus.Online : DeviceStatus.Offline,
                                            FirstSeen = DateTime.UtcNow,
                                            LastSeen = DateTime.UtcNow,
                                            ManagedServerId = serverId,
                                            IsStaticIp = true,
                                            IsDhcpAssigned = false,
                                            Source = DiscoverySource.ManualEntry,
                                            Notes = $"Virtual Machine on {server.Name}\nInterface: {interfaceName}",
                                            Vendor = "Virtual Machine"
                                        };

                                        // Try to find subnet
                                        var allSubnets = await _ipManagementService.GetAllSubnetsAsync();
                                        foreach (var subnet in allSubnets)
                                        {
                                            if (IsIpInSubnet(ipAddress, subnet.Network))
                                            {
                                                newDevice.SubnetId = subnet.Id;
                                                break;
                                            }
                                        }

                                        await _ipManagementService.CreateOrUpdateDeviceAsync(newDevice);
                                    }

                                    result.DevicesSynced++;
                                    result.Details.Add($"VM: {vmName} ({ipAddress})");
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to sync VM {VmName} on server {ServerId}", vmName, serverId);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to sync VMs for server {ServerId}", serverId);
        }

        return result;
    }

    private async Task<NetworkInterfaceSyncResult> SyncNetworkInterfacesAsync(SshClient client, ManagedServer server, int serverId)
    {
        var result = new NetworkInterfaceSyncResult();

        try
        {
            // Get all network interfaces with IPs
            var ipCommand = "ip -o -4 addr show | awk '{print $2,$4}' | grep -v '^lo ' | grep -v '^docker'";
            var ipOutput = await ExecuteCommandAsync(client, ipCommand);

            if (string.IsNullOrEmpty(ipOutput))
            {
                _logger.LogDebug("No network interfaces found on server {ServerId}", serverId);
                return result;
            }

            var lines = ipOutput.Split('\n', StringSplitOptions.RemoveEmptyEntries);

            foreach (var line in lines)
            {
                try
                {
                    var parts = line.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                    if (parts.Length >= 2)
                    {
                        var interfaceName = parts[0].Trim();
                        var ipWithMask = parts[1].Trim();
                        var ipAddress = ipWithMask.Split('/')[0];

                        // Skip if not a valid IP or is a link-local address
                        if (!System.Net.IPAddress.TryParse(ipAddress, out var parsedIp) ||
                            ipAddress.StartsWith("127.") ||
                            ipAddress.StartsWith("169.254."))
                        {
                            continue;
                        }

                        // Get MAC address for this interface
                        var macCommand = $"cat /sys/class/net/{interfaceName}/address 2>/dev/null";
                        var macAddress = await ExecuteCommandAsync(client, macCommand);
                        macAddress = macAddress.Trim();

                        // Determine device type based on interface name
                        var deviceType = interfaceName.StartsWith("br") ? DeviceType.NetworkDevice :
                                       interfaceName.StartsWith("bond") ? DeviceType.NetworkDevice :
                                       interfaceName.StartsWith("vlan") ? DeviceType.NetworkDevice :
                                       DeviceType.Server;

                        // Check if device already exists
                        var existingDevice = !string.IsNullOrEmpty(macAddress)
                            ? await _ipManagementService!.FindDeviceByMacAsync(macAddress)
                            : null;

                        existingDevice ??= await _ipManagementService!.GetDeviceByIpAsync(ipAddress);

                        // Only create/update if this is a significant interface (bridges, bonds, or static IPs)
                        if (interfaceName.StartsWith("br") || interfaceName.StartsWith("bond") ||
                            interfaceName.StartsWith("vlan"))
                        {
                            if (existingDevice != null)
                            {
                                existingDevice.IpAddress = ipAddress;
                                existingDevice.MacAddress = string.IsNullOrEmpty(macAddress) ? existingDevice.MacAddress : macAddress;
                                existingDevice.Hostname = $"{server.Name}-{interfaceName}";
                                existingDevice.DeviceType = deviceType;
                                existingDevice.Status = DeviceStatus.Online;
                                existingDevice.LastSeen = DateTime.UtcNow;
                                existingDevice.ManagedServerId = serverId;
                                existingDevice.IsStaticIp = true;
                                existingDevice.IsDhcpAssigned = false;
                                existingDevice.Source = DiscoverySource.NetworkScan;
                                existingDevice.Notes = $"Network Interface on {server.Name}\nInterface: {interfaceName}";
                                existingDevice.Vendor = "Network Interface";

                                await _ipManagementService.CreateOrUpdateDeviceAsync(existingDevice);
                                result.DevicesSynced++;
                                result.Details.Add($"Interface: {interfaceName} ({ipAddress})");
                            }
                            else
                            {
                                var newDevice = new NetworkDevice
                                {
                                    IpAddress = ipAddress,
                                    MacAddress = macAddress,
                                    Hostname = $"{server.Name}-{interfaceName}",
                                    DeviceType = deviceType,
                                    Status = DeviceStatus.Online,
                                    FirstSeen = DateTime.UtcNow,
                                    LastSeen = DateTime.UtcNow,
                                    ManagedServerId = serverId,
                                    IsStaticIp = true,
                                    IsDhcpAssigned = false,
                                    Source = DiscoverySource.NetworkScan,
                                    Notes = $"Network Interface on {server.Name}\nInterface: {interfaceName}",
                                    Vendor = "Network Interface"
                                };

                                // Try to find subnet
                                var allSubnets = await _ipManagementService.GetAllSubnetsAsync();
                                foreach (var subnet in allSubnets)
                                {
                                    if (IsIpInSubnet(ipAddress, subnet.Network))
                                    {
                                        newDevice.SubnetId = subnet.Id;
                                        break;
                                    }
                                }

                                await _ipManagementService.CreateOrUpdateDeviceAsync(newDevice);
                                result.DevicesSynced++;
                                result.Details.Add($"Interface: {interfaceName} ({ipAddress})");
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to process network interface line: {Line}", line);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to sync network interfaces for server {ServerId}", serverId);
        }

        return result;
    }

    public async Task<BulkSyncResult> SyncAllServersAsync()
    {
        var result = new BulkSyncResult
        {
            Success = false
        };

        try
        {
            var servers = await GetServersAsync();
            result.TotalServers = servers.Count();

            foreach (var server in servers)
            {
                try
                {
                    _logger.LogInformation("🔄 Syncing server: {ServerName} (ID: {ServerId})",
                        server.Name, server.Id);

                    var syncResult = await SyncAllNetworkInterfacesAsync(server.Id);

                    if (syncResult.Success)
                    {
                        result.SuccessfulServers++;
                        result.TotalDevicesSynced += syncResult.TotalDevicesSynced;
                        result.ServerResults.Add(new ServerSyncSummary
                        {
                            ServerId = server.Id,
                            ServerName = server.Name,
                            Success = true,
                            DevicesSynced = syncResult.TotalDevicesSynced,
                            Details = $"Docker: {syncResult.DockerContainersSynced}, VMs: {syncResult.VirtualMachinesSynced}, Interfaces: {syncResult.NetworkInterfacesSynced}"
                        });
                    }
                    else
                    {
                        result.FailedServers++;
                        result.ServerResults.Add(new ServerSyncSummary
                        {
                            ServerId = server.Id,
                            ServerName = server.Name,
                            Success = false,
                            ErrorMessage = syncResult.ErrorMessage
                        });
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to sync server {ServerId}", server.Id);
                    result.FailedServers++;
                    result.ServerResults.Add(new ServerSyncSummary
                    {
                        ServerId = server.Id,
                        ServerName = server.Name,
                        Success = false,
                        ErrorMessage = ex.Message
                    });
                }
            }

            result.Success = result.SuccessfulServers > 0;

            _logger.LogInformation(
                "✅ Bulk sync completed: {Success}/{Total} servers synced, {Devices} total devices",
                result.SuccessfulServers, result.TotalServers, result.TotalDevicesSynced);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Bulk sync failed");
            result.ErrorMessage = ex.Message;
        }

        return result;
    }

    // Helper result classes
    private class VmSyncResult
    {
        public int DevicesSynced { get; set; }
        public List<string> Details { get; set; } = new();
    }

    private class NetworkInterfaceSyncResult
    {
        public int DevicesSynced { get; set; }
        public List<string> Details { get; set; } = new();
    }

    public async Task<IpConflictCheckResult> CheckIpConflictAsync(string ipAddress, int? excludeDeviceId = null)
    {
        var result = new IpConflictCheckResult
        {
            IsAvailable = true,
            HasConflict = false
        };

        try
        {
            _logger.LogInformation("🔍 Checking IP {IpAddress} for conflicts", ipAddress);

            // 1. Check database for existing devices
            var existingDevice = await _ipManagementService?.GetDeviceByIpAsync(ipAddress)!;
            if (existingDevice != null && (excludeDeviceId == null || existingDevice.Id != excludeDeviceId))
            {
                result.HasConflict = true;
                result.IsAvailable = false;
                result.Conflicts.Add(new IpConflictDetail
                {
                    Source = "Database",
                    DeviceName = existingDevice.Hostname ?? "Unknown",
                    ServerName = existingDevice.ManagedServerId != null ?
                        (await GetServerAsync(existingDevice.ManagedServerId.Value))?.Name : null,
                    ServerId = existingDevice.ManagedServerId,
                    MacAddress = existingDevice.MacAddress,
                    Details = $"Device Type: {existingDevice.DeviceType}, Source: {existingDevice.Source}",
                    Status = existingDevice.Status.ToString()
                });
            }

            // 2. Check all servers for Docker containers (running and stopped)
            var servers = await GetServersAsync();
            foreach (var server in servers)
            {
                try
                {
                    using var client = CreateSshClient(server);
                    client.Connect();

                    // Check Docker containers
                    var dockerCheck = await CheckDockerContainersForIpAsync(client, server, ipAddress);
                    if (dockerCheck.HasConflict)
                    {
                        result.HasConflict = true;
                        result.IsAvailable = false;
                        result.Conflicts.AddRange(dockerCheck.Conflicts);
                    }

                    // Check VMs
                    var vmCheck = await CheckVmsForIpAsync(client, server, ipAddress);
                    if (vmCheck.HasConflict)
                    {
                        result.HasConflict = true;
                        result.IsAvailable = false;
                        result.Conflicts.AddRange(vmCheck.Conflicts);
                    }

                    // Check network interfaces
                    var interfaceCheck = await CheckNetworkInterfacesForIpAsync(client, server, ipAddress);
                    if (interfaceCheck.HasConflict)
                    {
                        result.HasConflict = true;
                        result.IsAvailable = false;
                        result.Conflicts.AddRange(interfaceCheck.Conflicts);
                    }

                    client.Disconnect();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to check server {ServerName} for IP conflicts", server.Name);
                }
            }

            // 3. Network scan (ping test)
            result.IsReachableOnNetwork = await PingTestAsync(ipAddress);
            if (result.IsReachableOnNetwork && !result.HasConflict)
            {
                result.HasConflict = true;
                result.IsAvailable = false;
                result.Conflicts.Add(new IpConflictDetail
                {
                    Source = "Network Scan",
                    DeviceName = "Unknown Device",
                    Details = "Device responded to ping but not found in system",
                    Status = "Online"
                });
            }

            result.PingResponse = result.IsReachableOnNetwork ? "Device is reachable" : "Device not reachable";

            _logger.LogInformation(
                "✅ IP conflict check completed for {IpAddress}: Available={Available}, HasConflict={HasConflict}, Conflicts={ConflictCount}",
                ipAddress, result.IsAvailable, result.HasConflict, result.Conflicts.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to check IP {IpAddress} for conflicts", ipAddress);
        }

        return result;
    }

    private async Task<IpConflictCheckResult> CheckDockerContainersForIpAsync(SshClient client, ManagedServer server, string ipAddress)
    {
        var result = new IpConflictCheckResult();

        try
        {
            // Get all containers (running and stopped)
            var dockerPsCommand = "docker ps -a --format \"{{.ID}}|{{.Names}}|{{.Status}}\" --no-trunc";
            var dockerPsOutput = await ExecuteCommandAsync(client, dockerPsCommand);

            if (string.IsNullOrEmpty(dockerPsOutput))
                return result;

            var lines = dockerPsOutput.Split('\n', StringSplitOptions.RemoveEmptyEntries);

            foreach (var line in lines)
            {
                var parts = line.Split('|');
                if (parts.Length >= 3)
                {
                    var containerId = parts[0].Trim();
                    var containerName = parts[1].Trim();
                    var status = parts[2].Trim();

                    // Get all IPs for this container
                    var inspectCommand = $"docker inspect {containerId} --format '{{{{range .NetworkSettings.Networks}}}}{{{{.IPAddress}}}}|{{{{end}}}}'";
                    var ipsOutput = await ExecuteCommandAsync(client, inspectCommand);

                    if (!string.IsNullOrEmpty(ipsOutput))
                    {
                        var ips = ipsOutput.Split('|', StringSplitOptions.RemoveEmptyEntries);
                        foreach (var ip in ips)
                        {
                            if (ip.Trim() == ipAddress)
                            {
                                result.HasConflict = true;
                                result.Conflicts.Add(new IpConflictDetail
                                {
                                    Source = "Docker",
                                    DeviceName = containerName,
                                    ServerName = server.Name,
                                    ServerId = server.Id,
                                    Details = $"Docker Container",
                                    Status = status.Contains("Up") ? "Online" : "Offline"
                                });
                            }
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to check Docker containers on server {ServerId}", server.Id);
        }

        return result;
    }

    private async Task<IpConflictCheckResult> CheckVmsForIpAsync(SshClient client, ManagedServer server, string ipAddress)
    {
        var result = new IpConflictCheckResult();

        try
        {
            // Check if virsh is available
            var virshCheck = await ExecuteCommandAsync(client, "command -v virsh >/dev/null 2>&1; echo $?");
            if (virshCheck.Trim() != "0")
                return result;

            // Get all VMs
            var vmListCommand = "virsh list --all --name";
            var vmListOutput = await ExecuteCommandAsync(client, vmListCommand);

            if (string.IsNullOrEmpty(vmListOutput))
                return result;

            var vmNames = vmListOutput.Split('\n', StringSplitOptions.RemoveEmptyEntries)
                .Select(n => n.Trim())
                .Where(n => !string.IsNullOrEmpty(n))
                .ToList();

            foreach (var vmName in vmNames)
            {
                try
                {
                    var vmInfoCommand = $"virsh domifaddr {vmName} --source agent 2>/dev/null || virsh domifaddr {vmName} 2>/dev/null";
                    var vmInfoOutput = await ExecuteCommandAsync(client, vmInfoCommand);

                    var vmStateCommand = $"virsh domstate {vmName}";
                    var vmState = await ExecuteCommandAsync(client, vmStateCommand);

                    if (!string.IsNullOrEmpty(vmInfoOutput) && vmInfoOutput.Contains(ipAddress))
                    {
                        result.HasConflict = true;
                        result.Conflicts.Add(new IpConflictDetail
                        {
                            Source = "VM",
                            DeviceName = vmName,
                            ServerName = server.Name,
                            ServerId = server.Id,
                            Details = "Virtual Machine",
                            Status = vmState.Trim().Equals("running", StringComparison.OrdinalIgnoreCase) ? "Online" : "Offline"
                        });
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to check VM {VmName}", vmName);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to check VMs on server {ServerId}", server.Id);
        }

        return result;
    }

    private async Task<IpConflictCheckResult> CheckNetworkInterfacesForIpAsync(SshClient client, ManagedServer server, string ipAddress)
    {
        var result = new IpConflictCheckResult();

        try
        {
            var ipCommand = $"ip -o -4 addr show | grep '{ipAddress}/' | awk '{{print $2}}'";
            var interfaceOutput = await ExecuteCommandAsync(client, ipCommand);

            if (!string.IsNullOrEmpty(interfaceOutput))
            {
                var interfaceName = interfaceOutput.Trim();
                result.HasConflict = true;
                result.Conflicts.Add(new IpConflictDetail
                {
                    Source = "NetworkInterface",
                    DeviceName = $"{server.Name}-{interfaceName}",
                    ServerName = server.Name,
                    ServerId = server.Id,
                    Details = $"Network Interface: {interfaceName}",
                    Status = "Online"
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to check network interfaces on server {ServerId}", server.Id);
        }

        return result;
    }

    private async Task<bool> PingTestAsync(string ipAddress)
    {
        try
        {
            using var ping = new System.Net.NetworkInformation.Ping();
            var reply = await ping.SendPingAsync(ipAddress, 1000); // 1 second timeout
            return reply.Status == System.Net.NetworkInformation.IPStatus.Success;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Ping test failed for {IpAddress}", ipAddress);
            return false;
        }
    }

    public async Task<DockerNetworkMigrationAnalysis> AnalyzeDockerNetworksAsync(int serverId)
    {
        var result = new DockerNetworkMigrationAnalysis
        {
            ServerId = serverId
        };

        try
        {
            var server = await GetServerAsync(serverId);
            if (server == null)
            {
                return result;
            }

            result.ServerName = server.Name;

            // Get all Docker containers
            var discoveryResult = await DiscoverDockerServicesAsync(serverId);
            if (!discoveryResult.Success)
            {
                return result;
            }

            result.TotalContainers = discoveryResult.Services.Count;

            // Group containers by network mode
            foreach (var container in discoveryResult.Services)
            {
                var networkMode = container.NetworkMode ?? "unknown";

                if (!result.ContainersByNetwork.ContainsKey(networkMode))
                {
                    result.ContainersByNetwork[networkMode] = new List<DockerContainerInfo>();
                }

                var containerInfo = new DockerContainerInfo
                {
                    ContainerId = container.ContainerId,
                    Name = container.Name,
                    Image = container.Image,
                    Status = container.Status,
                    NetworkMode = networkMode,
                    CurrentIp = container.Networks.FirstOrDefault()?.IpAddress,
                    IsRunning = container.Status.Contains("Up"),
                    NeedsMigration = networkMode == "br0" // Mark br0 containers for migration
                };

                result.ContainersByNetwork[networkMode].Add(containerInfo);

                if (containerInfo.NeedsMigration)
                {
                    result.ContainersNeedingMigration++;
                }
            }

            // Suggest IP range for migration
            result.SuggestedIpRange = new List<string> { "192.168.4.100", "192.168.4.249" };

            _logger.LogInformation(
                "📊 Network Analysis for {ServerName}: {Total} containers, {NeedMigration} need migration from br0",
                server.Name, result.TotalContainers, result.ContainersNeedingMigration);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to analyze Docker networks for server {ServerId}", serverId);
        }

        return result;
    }

    public async Task<IpSuggestionResult> SuggestIpsForMigrationAsync(IpSuggestionRequest request)
    {
        var result = new IpSuggestionResult
        {
            Success = false
        };

        try
        {
            var server = await GetServerAsync(request.ServerId);
            if (server == null)
            {
                result.ErrorMessage = "Server not found";
                return result;
            }

            // Get all Docker containers to identify which ones need suggestions
            var discoveryResult = await DiscoverDockerServicesAsync(request.ServerId);
            if (!discoveryResult.Success)
            {
                result.ErrorMessage = "Failed to discover Docker containers";
                return result;
            }

            _logger.LogInformation("🔍 Finding available IPs in range {Start} - {End} for {Count} containers",
                request.IpRangeStart, request.IpRangeEnd, request.ContainerIds.Count);

            // Parse IP range
            var startParts = request.IpRangeStart.Split('.').Select(int.Parse).ToArray();
            var endParts = request.IpRangeEnd.Split('.').Select(int.Parse).ToArray();

            if (startParts.Length != 4 || endParts.Length != 4)
            {
                result.ErrorMessage = "Invalid IP range format";
                return result;
            }

            var startLastOctet = startParts[3];
            var endLastOctet = endParts[3];
            var ipPrefix = $"{startParts[0]}.{startParts[1]}.{startParts[2]}";

            // Find available IPs for each container
            foreach (var containerId in request.ContainerIds)
            {
                var container = discoveryResult.Services.FirstOrDefault(c => c.ContainerId == containerId);
                if (container == null)
                {
                    _logger.LogWarning("Container {ContainerId} not found", containerId);
                    continue;
                }

                string? suggestedIp = null;
                IpConflictCheckResult? conflictCheck = null;

                // Search for available IP
                for (int octet = startLastOctet; octet <= endLastOctet; octet++)
                {
                    result.TotalChecked++;
                    var testIp = $"{ipPrefix}.{octet}";

                    // Check if this IP is available
                    conflictCheck = await CheckIpConflictAsync(testIp);

                    if (conflictCheck.IsAvailable && !conflictCheck.HasConflict)
                    {
                        suggestedIp = testIp;
                        result.AvailableIpsFound++;
                        break;
                    }
                }

                // Create suggestion
                var suggestion = new ContainerIpSuggestion
                {
                    ContainerId = container.ContainerId,
                    ContainerName = container.Name,
                    CurrentIp = container.Networks.FirstOrDefault()?.IpAddress,
                    SuggestedIp = suggestedIp ?? "No available IP found",
                    HasConflict = suggestedIp == null,
                    Conflicts = conflictCheck?.HasConflict == true ? conflictCheck.Conflicts : new List<IpConflictDetail>()
                };

                result.Suggestions.Add(suggestion);
            }

            result.Success = true;

            _logger.LogInformation(
                "✅ IP Suggestion completed: {Found} available IPs found out of {Checked} checked for {Containers} containers",
                result.AvailableIpsFound, result.TotalChecked, request.ContainerIds.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to suggest IPs for migration");
            result.ErrorMessage = ex.Message;
        }

        return result;
    }
}