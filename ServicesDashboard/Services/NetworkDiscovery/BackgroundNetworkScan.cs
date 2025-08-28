using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Results;

namespace ServicesDashboard.Services.NetworkDiscovery;

public interface IBackgroundNetworkScanService
{
    Task<Guid> StartScanAsync(string target, string scanType, int[]? ports = null, bool fullScan = false);
    Task<NetworkScanSession?> GetScanStatusAsync(Guid scanId);
    Task<IEnumerable<NetworkScanSession>> GetRecentScansAsync(int limit = 10);
    Task<IEnumerable<StoredDiscoveredService>> GetScanResultsAsync(Guid scanId);
    Task<IEnumerable<StoredDiscoveredService>> GetLatestDiscoveredServicesAsync(string target);
    Task MarkServicesInactiveAsync(string target, IEnumerable<string> currentServiceKeys);
}

public class BackgroundNetworkScan : BackgroundService, IBackgroundNetworkScanService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<BackgroundNetworkScan> _logger;
    private readonly Queue<ScanRequest> _scanQueue = new();
    private readonly SemaphoreSlim _queueSemaphore = new(1, 1);

    public BackgroundNetworkScan(
        IServiceProvider serviceProvider, 
        ILogger<BackgroundNetworkScan> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    public async Task<Guid> StartScanAsync(string target, string scanType, int[]? ports = null, bool fullScan = false)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();

        // Create scan session
        var scanSession = new NetworkScanSession
        {
            Id = Guid.NewGuid(),
            Target = target,
            ScanType = scanType,
            Status = "pending",
            StartedAt = DateTime.UtcNow
        };

        context.NetworkScanSessions.Add(scanSession);
        await context.SaveChangesAsync();

        // Queue the scan
        var scanRequest = new ScanRequest
        {
            ScanId = scanSession.Id,
            Target = target,
            ScanType = scanType,
            Ports = ports,
            FullScan = fullScan
        };

        await _queueSemaphore.WaitAsync();
        try
        {
            _scanQueue.Enqueue(scanRequest);
        }
        finally
        {
            _queueSemaphore.Release();
        }

        _logger.LogInformation("Queued scan {ScanId} for target {Target}", scanSession.Id, target);
        return scanSession.Id;
    }

    public async Task<NetworkScanSession?> GetScanStatusAsync(Guid scanId)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();

        return await context.NetworkScanSessions
            .Include(s => s.DiscoveredServices)
            .FirstOrDefaultAsync(s => s.Id == scanId);
    }

    public async Task<IEnumerable<NetworkScanSession>> GetRecentScansAsync(int limit = 10)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();

        return await context.NetworkScanSessions
            .OrderByDescending(s => s.StartedAt)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<IEnumerable<StoredDiscoveredService>> GetScanResultsAsync(Guid scanId)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();

        return await context.StoredDiscoveredServices
            .Where(s => s.ScanSessionId == scanId)
            .OrderBy(s => s.HostAddress)
            .ThenBy(s => s.Port)
            .ToListAsync();
    }

    public async Task<IEnumerable<StoredDiscoveredService>> GetLatestDiscoveredServicesAsync(string target)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();

        // Get the most recent completed scan for this target
        var latestScan = await context.NetworkScanSessions
            .Where(s => s.Target == target && s.Status == "completed")
            .OrderByDescending(s => s.CompletedAt)
            .FirstOrDefaultAsync();

        if (latestScan == null)
            return Enumerable.Empty<StoredDiscoveredService>();

        return await context.StoredDiscoveredServices
            .Where(s => s.ScanSessionId == latestScan.Id)
            .OrderBy(s => s.HostAddress)
            .ThenBy(s => s.Port)
            .ToListAsync();
    }

    public async Task MarkServicesInactiveAsync(string target, IEnumerable<string> currentServiceKeys)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();

        // Get all previously discovered services for this target
        var previousServices = await context.StoredDiscoveredServices
            .Include(s => s.ScanSession)
            .Where(s => s.ScanSession.Target == target && s.IsActive)
            .ToListAsync();

        var currentKeys = currentServiceKeys.ToHashSet();

        foreach (var service in previousServices)
        {
            var serviceKey = $"{service.HostAddress}:{service.Port}";
            if (!currentKeys.Contains(serviceKey))
            {
                service.IsActive = false;
                _logger.LogInformation("Marked service {ServiceKey} as inactive", serviceKey);
            }
        }

        await context.SaveChangesAsync();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Background Network Scan Service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                ScanRequest? scanRequest = null;

                await _queueSemaphore.WaitAsync(stoppingToken);
                try
                {
                    if (_scanQueue.Count > 0)
                    {
                        scanRequest = _scanQueue.Dequeue();
                    }
                }
                finally
                {
                    _queueSemaphore.Release();
                }

                if (scanRequest != null)
                {
                    await ProcessScanAsync(scanRequest, stoppingToken);
                }
                else
                {
                    // No scans in queue, wait before checking again
                    await Task.Delay(1000, stoppingToken);
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in background scan service");
                await Task.Delay(5000, stoppingToken); // Wait before retrying
            }
        }

        _logger.LogInformation("Background Network Scan Service stopped");
    }

    private async Task ProcessScanAsync(ScanRequest request, CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();
        var networkDiscoveryService = scope.ServiceProvider.GetRequiredService<INetworkDiscoveryService>();

        var scanSession = await context.NetworkScanSessions.FindAsync(request.ScanId);
        if (scanSession == null)
        {
            _logger.LogWarning("Scan session {ScanId} not found", request.ScanId);
            return;
        }

        try
        {
            _logger.LogInformation("Starting scan {ScanId} for target {Target}", request.ScanId, request.Target);
            
            // Update scan status
            scanSession.Status = "running";
            await context.SaveChangesAsync();

            // Perform the actual scan
            IEnumerable<DiscoveredServiceResult> results;
            var isNetwork = request.Target.Contains('/') || request.Target.Contains('-');

            if (isNetwork)
            {
                results = await networkDiscoveryService.ScanNetworkAsync(
                    request.Target, 
                    request.Ports, 
                    request.FullScan, 
                    cancellationToken);
            }
            else
            {
                results = await networkDiscoveryService.ScanHostAsync(
                    request.Target, 
                    request.Ports, 
                    request.FullScan, 
                    cancellationToken);
            }

            // Store results
            var currentServiceKeys = new List<string>();
            foreach (var result in results)
            {
                var storedService = new StoredDiscoveredService
                {
                    ScanSessionId = request.ScanId,
                    HostAddress = result.HostAddress,
                    HostName = result.HostName,
                    Port = result.Port,
                    IsReachable = result.IsReachable,
                    ServiceType = result.ServiceType,
                    Banner = result.Banner,
                    ResponseTime = result.ResponseTime,
                    DiscoveredAt = result.DiscoveredAt,
                    LastSeenAt = DateTime.UtcNow,
                    IsActive = true
                };

                context.StoredDiscoveredServices.Add(storedService);
                currentServiceKeys.Add($"{result.HostAddress}:{result.Port}");
            }

            // Mark previously discovered services as inactive if they're no longer found
            await MarkServicesInactiveAsync(request.Target, currentServiceKeys);

            // Update scan completion
            scanSession.Status = "completed";
            scanSession.CompletedAt = DateTime.UtcNow;
            await context.SaveChangesAsync();

            _logger.LogInformation("Completed scan {ScanId}. Found {ResultCount} services", 
                request.ScanId, results.Count());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing scan {ScanId}", request.ScanId);
            
            scanSession.Status = "failed";
            scanSession.ErrorMessage = ex.Message;
            scanSession.CompletedAt = DateTime.UtcNow;
            await context.SaveChangesAsync();
        }
    }

    private class ScanRequest
    {
        public Guid ScanId { get; set; }
        public string Target { get; set; } = string.Empty;
        public string ScanType { get; set; } = string.Empty;
        public int[]? Ports { get; set; }
        public bool FullScan { get; set; }
    }
}
