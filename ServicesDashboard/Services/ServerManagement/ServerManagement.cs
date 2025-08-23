using ServicesDashboard.Models.ServerManagement;
using ServicesDashboard.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Microsoft.Extensions.Options;
using OllamaSharp;
using OllamaSharp.Models;
using Renci.SshNet;
using ServicesDashboard.Models;
using System.Text;

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
        
        // Encrypt password if provided
        if (!string.IsNullOrEmpty(server.EncryptedPassword))
        {
            server.EncryptedPassword = EncryptPassword(server.EncryptedPassword);
        }

        _context.ManagedServers.Add(server);
        await _context.SaveChangesAsync();

        // Perform initial health check in background
        _ = Task.Run(async () => {
            try
            {
                await PerformHealthCheckAsync(server.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Initial health check failed for server {ServerId}", server.Id);
            }
        });

        return server;
    }

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
                var updateInfo = await GetUpdateInfoAsync(client, server.OperatingSystem);
                
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
                        $"{updateInfo.TotalUpdates} updates available ({updateInfo.SecurityUpdates} security)");
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

            // Only include Server if we need it - avoid circular references
            var alerts = await query
                .Include(a => a.Server)
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();

            return alerts;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting active alerts for serverId: {ServerId}", serverId);
        
            // Return empty list instead of throwing to prevent UI crashes
            return new List<ServerAlert>();
        }
    }

    public async Task<bool> TestConnectionAsync(ManagedServer server)
    {
        try
        {
            using var client = CreateSshClient(server);
            client.Connect();
            var result = client.IsConnected;
            client.Disconnect();
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Connection test failed for server {ServerName}", server.Name);
            return false;
        }
    }

    // Private helper methods
    private SshClient CreateSshClient(ManagedServer server)
    {
        var connectionInfo = new Renci.SshNet.ConnectionInfo(
            server.HostAddress,
            server.SshPort ?? 22,
            server.Username ?? "root",
            new PasswordAuthenticationMethod(server.Username ?? "root", 
                DecryptPassword(server.EncryptedPassword ?? "")));

        connectionInfo.Timeout = TimeSpan.FromSeconds(30);
        return new SshClient(connectionInfo);
    }

    private async Task<SystemMetrics> GetSystemMetricsAsync(SshClient client)
    {
        var metrics = new SystemMetrics();

        try
        {
            // CPU Usage - simplified approach
            var cpuResult = await ExecuteCommandAsync(client, "grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$3+$4+$5)} END {print usage}'");
            if (double.TryParse(cpuResult, out var cpu))
                metrics.CpuUsage = cpu;

            // Memory Usage
            var memResult = await ExecuteCommandAsync(client, "free | grep Mem | awk '{printf \"%.1f\", $3/$2 * 100.0}'");
            if (double.TryParse(memResult, out var mem))
                metrics.MemoryUsage = mem;

            // Disk Usage
            var diskResult = await ExecuteCommandAsync(client, "df -h / | awk 'NR==2{print $5}' | sed 's/%//'");
            if (double.TryParse(diskResult, out var disk))
                metrics.DiskUsage = disk;

            // Load Average
            var loadResult = await ExecuteCommandAsync(client, "uptime | awk -F'load average:' '{print $2}' | cut -d, -f1 | xargs");
            if (double.TryParse(loadResult, out var load))
                metrics.LoadAverage = load;

            // Running Processes
            var procResult = await ExecuteCommandAsync(client, "ps aux | wc -l");
            if (int.TryParse(procResult, out var proc))
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

    private async Task<UpdateInfo> GetUpdateInfoAsync(SshClient client, string? osType)
    {
        var updateInfo = new UpdateInfo();
        
        try
        {
            // Detect package manager and get update info
            if (osType?.ToLower().Contains("ubuntu") == true || osType?.ToLower().Contains("debian") == true)
            {
                // Update package lists first (non-interactive)
                await ExecuteCommandAsync(client, "DEBIAN_FRONTEND=noninteractive apt-get update -qq");
                
                var updatesResult = await ExecuteCommandAsync(client, "apt list --upgradable 2>/dev/null | grep -v 'Listing...' | wc -l");
                if (int.TryParse(updatesResult, out var totalUpdates))
                    updateInfo.TotalUpdates = totalUpdates;

                var securityResult = await ExecuteCommandAsync(client, "apt list --upgradable 2>/dev/null | grep -i security | wc -l");
                if (int.TryParse(securityResult, out var secUpdates))
                    updateInfo.SecurityUpdates = secUpdates;
            }
            else if (osType?.ToLower().Contains("centos") == true || osType?.ToLower().Contains("rhel") == true || osType?.ToLower().Contains("fedora") == true)
            {
                var updatesResult = await ExecuteCommandAsync(client, "yum check-update -q | grep -v 'Loaded plugins' | wc -l");
                if (int.TryParse(updatesResult, out var totalUpdates))
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

    private ServerStatus DetermineServerStatus(SystemMetrics metrics)
    {
        if (metrics.CpuUsage > 90 || metrics.MemoryUsage > 90 || metrics.DiskUsage > 95)
            return ServerStatus.Critical;
        
        if (metrics.CpuUsage > 80 || metrics.MemoryUsage > 80 || metrics.DiskUsage > 90)
            return ServerStatus.Warning;

        return ServerStatus.Online;
    }

    private async Task CreateAlertsIfNeeded(ManagedServer server, SystemMetrics metrics)
    {
        // High CPU alert
        if (metrics.CpuUsage > 85)
        {
            await CreateAlert(server, AlertType.HighCpuUsage, 
                metrics.CpuUsage > 95 ? AlertSeverity.Critical : AlertSeverity.High,
                $"CPU usage is {metrics.CpuUsage:F1}%");
        }

        // High Memory alert
        if (metrics.MemoryUsage > 85)
        {
            await CreateAlert(server, AlertType.HighMemoryUsage,
                metrics.MemoryUsage > 95 ? AlertSeverity.Critical : AlertSeverity.High,
                $"Memory usage is {metrics.MemoryUsage:F1}%");
        }

        // High Disk alert
        if (metrics.DiskUsage > 85)
        {
            await CreateAlert(server, AlertType.HighDiskUsage,
                metrics.DiskUsage > 95 ? AlertSeverity.Critical : AlertSeverity.High,
                $"Disk usage is {metrics.DiskUsage:F1}%");
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

    private async Task<(string Recommendation, double Confidence)> GetAiUpdateRecommendation(ManagedServer server, UpdateInfo updateInfo)
    {
        try
        {
            var prompt = $@"
Server: {server.Name} ({server.Type})
Operating System: {server.OperatingSystem}
Available Updates: {updateInfo.TotalUpdates}
Security Updates: {updateInfo.SecurityUpdates}

Please provide a brief recommendation for applying these updates. Consider:
1. Security implications
2. Update priority
3. Best practices for timing
4. Risk assessment

Respond with a JSON object containing 'recommendation' and 'confidence' (0-1).
Example: {{""recommendation"": ""Apply security updates immediately, schedule others for maintenance window"", ""confidence"": 0.8}}
";

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
        var fallbackRecommendation = updateInfo.SecurityUpdates > 0 
            ? $"Apply {updateInfo.SecurityUpdates} security updates immediately, schedule remaining {updateInfo.TotalUpdates - updateInfo.SecurityUpdates} updates for maintenance window"
            : $"Schedule {updateInfo.TotalUpdates} updates for next maintenance window";

        return (fallbackRecommendation, 0.5);
    }

    private string EncryptPassword(string password)
    {
        // For production, use proper encryption like Microsoft.AspNetCore.DataProtection
        // This is a simplified example for demo purposes
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(password));
    }

    private string DecryptPassword(string encryptedPassword)
    {
        // For production, use proper decryption
        // This is a simplified example for demo purposes
        try
        {
            return Encoding.UTF8.GetString(Convert.FromBase64String(encryptedPassword));
        }
        catch
        {
            return "";
        }
    }
}

// Helper classes
public class SystemMetrics
{
    public double CpuUsage { get; set; }
    public double MemoryUsage { get; set; }
    public double DiskUsage { get; set; }
    public double LoadAverage { get; set; }
    public int RunningProcesses { get; set; }
    public string? OperatingSystem { get; set; }
}

public class UpdateInfo
{
    public int TotalUpdates { get; set; }
    public int SecurityUpdates { get; set; }
    public List<object> Packages { get; set; } = new();
}

public class AiUpdateResponse
{
    public string? Recommendation { get; set; }
    public double Confidence { get; set; }
}