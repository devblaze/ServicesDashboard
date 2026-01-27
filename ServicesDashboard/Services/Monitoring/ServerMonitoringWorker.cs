using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;
using ServicesDashboard.Hubs;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Servers;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Services.Settings;

namespace ServicesDashboard.Services.Monitoring;

public class ServerMonitoringWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ServerMonitoringWorker> _logger;
    private readonly IHubContext<DiscoveryNotificationHub, IDiscoveryNotificationClient> _hubContext;

    private TimeSpan _monitoringInterval = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan ConnectivityCheckInterval = TimeSpan.FromSeconds(45);

    public ServerMonitoringWorker(
        IServiceProvider serviceProvider,
        ILogger<ServerMonitoringWorker> logger,
        IHubContext<DiscoveryNotificationHub, IDiscoveryNotificationClient> hubContext)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _hubContext = hubContext;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Server Monitoring Worker started");

        // Wait for application startup
        await Task.Delay(TimeSpan.FromSeconds(20), stoppingToken);

        var lastHealthCheck = DateTime.MinValue;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var settings = await GetMonitoringSettingsAsync();

                if (settings.EnableAutoMonitoring)
                {
                    _monitoringInterval = TimeSpan.FromMinutes(settings.MonitoringIntervalMinutes);

                    // Always run connectivity checks
                    await PerformConnectivityChecksAsync(stoppingToken);

                    // Run health checks at the configured interval
                    if (settings.EnableHealthChecks &&
                        DateTime.UtcNow - lastHealthCheck >= _monitoringInterval)
                    {
                        await PerformHealthChecksAsync(stoppingToken);
                        lastHealthCheck = DateTime.UtcNow;
                    }
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Server Monitoring Worker");
            }

            await Task.Delay(ConnectivityCheckInterval, stoppingToken);
        }

        _logger.LogInformation("Server Monitoring Worker stopped");
    }

    private async Task PerformConnectivityChecksAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();
        var serverService = scope.ServiceProvider.GetRequiredService<IServerManagementService>();

        var servers = await context.ManagedServers.ToListAsync(stoppingToken);
        if (servers.Count == 0) return;

        _logger.LogDebug("Running connectivity checks for {Count} servers", servers.Count);

        var semaphore = new SemaphoreSlim(5);
        var tasks = servers.Select(async server =>
        {
            await semaphore.WaitAsync(stoppingToken);
            try
            {
                var isOnline = await serverService.TestConnectionAsync(server);
                var previousStatus = server.Status;
                var newStatus = isOnline ? ServerStatus.Online : ServerStatus.Offline;

                if (server.Status != newStatus)
                {
                    server.Status = newStatus;
                    server.LastCheckTime = DateTime.UtcNow;
                    _logger.LogInformation("Server {Name} status changed: {Old} -> {New}",
                        server.Name, previousStatus, newStatus);
                }
                else
                {
                    server.LastCheckTime = DateTime.UtcNow;
                }

                // Broadcast status to all connected clients
                await _hubContext.Clients.All.ReceiveServerStatusUpdate(
                    server.Id, newStatus.ToString(), DateTime.UtcNow.ToString("o"));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Connectivity check failed for server {Name}", server.Name);
                server.Status = ServerStatus.Offline;
                server.LastCheckTime = DateTime.UtcNow;

                await _hubContext.Clients.All.ReceiveServerStatusUpdate(
                    server.Id, ServerStatus.Offline.ToString(), DateTime.UtcNow.ToString("o"));
            }
            finally
            {
                semaphore.Release();
            }
        });

        await Task.WhenAll(tasks);
        await context.SaveChangesAsync(stoppingToken);
    }

    private async Task PerformHealthChecksAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();
        var serverService = scope.ServiceProvider.GetRequiredService<IServerManagementService>();

        var onlineServers = await context.ManagedServers
            .Where(s => s.Status == ServerStatus.Online)
            .ToListAsync(stoppingToken);

        if (onlineServers.Count == 0) return;

        _logger.LogDebug("Running health checks for {Count} online servers", onlineServers.Count);

        var semaphore = new SemaphoreSlim(3);
        var tasks = onlineServers.Select(async server =>
        {
            await semaphore.WaitAsync(stoppingToken);
            try
            {
                var healthCheck = await serverService.PerformHealthCheckAsync(server.Id);
                if (healthCheck != null)
                {
                    await _hubContext.Clients.All.ReceiveServerHealthUpdate(
                        server.Id, healthCheck);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Health check failed for server {Name}", server.Name);
            }
            finally
            {
                semaphore.Release();
            }
        });

        await Task.WhenAll(tasks);
    }

    private async Task<ServerMonitoringSettings> GetMonitoringSettingsAsync()
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var settingsService = scope.ServiceProvider.GetRequiredService<ISettingsService>();
            return await settingsService.GetSettingsAsync<ServerMonitoringSettings>();
        }
        catch
        {
            return new ServerMonitoringSettings();
        }
    }
}
