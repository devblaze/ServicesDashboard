using ServicesDashboard.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Microsoft.Extensions.Options;
using OllamaSharp;
using OllamaSharp.Models;
using Renci.SshNet;
using ServicesDashboard.Models;
using System.Text;
using System.Globalization;
using ServicesDashboard.Models.Responses;
using ServicesDashboard.Models.Results;
using System.Text.RegularExpressions;

namespace ServicesDashboard.Services.ServerManagement;

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
    Task<SystemDiscoveryResult> PerformSystemDiscoveryAsync(ManagedServer server);
}

public class ServerManagement : IServerManagementService
{
    private readonly ServicesDashboardContext _context;
    private readonly ILogger<ServerManagement> _logger;
    private readonly IOllamaApiClient _ollamaClient;
    private readonly AppSettings _settings;

    public ServerManagement(
        ServicesDashboardContext context,
        ILogger<ServerManagement> logger,
        IOllamaApiClient ollamaClient,
        IOptions<AppSettings> settings)
    {
        _context = context;
        _logger = logger;
        _ollamaClient = ollamaClient;
        _settings = settings.Value;
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

    private async Task<SystemAiAnalysis> AnalyzeSystemInfoWithAiAsync(Dictionary<string, string> systemInfo)
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
                var analysis = JsonSerializer.Deserialize<SystemAiAnalysis>(jsonMatch.Value, new JsonSerializerOptions
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

    private SystemAiAnalysis ParseSystemInfoManually(Dictionary<string, string> systemInfo)
    {
        var analysis = new SystemAiAnalysis { Confidence = 0.6 };

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
        existingServer.Tags = server.Tags;
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

            using var cmd = client.CreateCommand(command);
            var output = cmd.Execute();

            result.Output = output ?? "";
            result.Error = cmd.Error ?? "";
            result.ExitCode = cmd.ExitStatus;

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
}

// Supporting classes for AI analysis
public class SystemAiAnalysis
{
    public string OperatingSystem { get; set; } = "";
    public string OsVersion { get; set; } = "";
    public string Architecture { get; set; } = "";
    public string KernelVersion { get; set; } = "";
    public string Hostname { get; set; } = "";
    public string SystemUptime { get; set; } = "";
    public string TotalMemory { get; set; } = "";
    public int InstalledPackages { get; set; }
    public List<string> RunningServices { get; set; } = new();
    public List<string> NetworkInterfaces { get; set; } = new();
    public string SystemLoad { get; set; } = "";
    public List<string> DiskInfo { get; set; } = new();
    public double Confidence { get; set; }
}

public class SystemDiscoveryResult
{
    public DateTime DiscoveryTime { get; set; }
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public string OperatingSystem { get; set; } = "";
    public string OsVersion { get; set; } = "";
    public string Architecture { get; set; } = "";
    public string KernelVersion { get; set; } = "";
    public string Hostname { get; set; } = "";
    public string SystemUptime { get; set; } = "";
    public string TotalMemory { get; set; } = "";
    public int AvailableUpdates { get; set; }
    public int SecurityUpdates { get; set; }
    public string PackageManager { get; set; } = "";
    public int InstalledPackages { get; set; }
    public List<string> RunningServices { get; set; } = new();
    public List<string> NetworkInterfaces { get; set; } = new();
    public string SystemLoad { get; set; } = "";
    public List<string> DiskInfo { get; set; } = new();
    public double AiConfidence { get; set; }
    public Dictionary<string, string> RawSystemData { get; set; } = new();
}

public class UpdateInfoResult
{
    public int TotalUpdates { get; set; }
    public int SecurityUpdates { get; set; }
    public string PackageManager { get; set; } = "";
    public List<string> Packages { get; set; } = new();
}

public class AiUpdateResponse
{
    public string Recommendation { get; set; } = "";
    public double Confidence { get; set; }
}