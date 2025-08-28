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
            .Where(s => s.ScanId == scanId)
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
            .Where(s => s.ScanId == latestScan.Id)
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
        _logger.LogInformation("Background Network Scan Service started at {StartTime}", DateTime.UtcNow);

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
                        _logger.LogInformation("Dequeued scan request {ScanId} from queue. Queue size: {QueueSize}",
                            scanRequest.ScanId, _scanQueue.Count);
                    }
                    else
                    {
                        _logger.LogDebug("Queue is empty, waiting for scans...");
                    }
                }
                finally
                {
                    _queueSemaphore.Release();
                }

                if (scanRequest != null)
                {
                    _logger.LogInformation("Processing scan request {ScanId} for target {Target}",
                        scanRequest.ScanId, scanRequest.Target);

                    await ProcessScanAsync(scanRequest, stoppingToken);

                    _logger.LogInformation("Finished processing scan request {ScanId}", scanRequest.ScanId);
                }
                else
                {
                    // No scans in queue, wait before checking again
                    await Task.Delay(1000, stoppingToken);
                }
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Background scan service cancelled");
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in background scan service main loop");
                await Task.Delay(5000, stoppingToken); // Wait before retrying
            }
        }

        _logger.LogInformation("Background Network Scan Service stopped at {StopTime}", DateTime.UtcNow);
    }

    private async Task ProcessScanAsync(ScanRequest request, CancellationToken cancellationToken)
    {
        ServicesDashboardContext? context = null;
        var scope = _serviceProvider.CreateScope();
        
        try
        {
            context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();
            var networkDiscoveryService = scope.ServiceProvider.GetRequiredService<INetworkDiscoveryService>();

            var scanSession = await context.NetworkScanSessions.FindAsync(request.ScanId);
            if (scanSession == null)
            {
                _logger.LogWarning("Scan session {ScanId} not found in database", request.ScanId);
                return;
            }

            _logger.LogInformation("Found scan session {ScanId} with status {Status}", request.ScanId, scanSession.Status);

            try
            {
                _logger.LogInformation(
                    "Starting scan {ScanId} for target {Target} (ScanType: {ScanType}, FullScan: {FullScan})",
                    request.ScanId, request.Target, request.ScanType, request.FullScan);

                // Update scan status to running
                await UpdateScanStatus(context, request.ScanId, "running");

                // Perform the actual scan
                IEnumerable<DiscoveredServiceResult> results;
                var isNetwork = request.Target.Contains('/') || request.Target.Contains('-');

                _logger.LogInformation("Scan type detection: {Target} -> Network: {IsNetwork}", request.Target, isNetwork);

                var scanStartTime = DateTime.UtcNow;

                if (isNetwork)
                {
                    _logger.LogInformation("Starting network scan for {Target} with ports: {Ports}",
                        request.Target, request.Ports != null ? string.Join(",", request.Ports) : "default");

                    results = await networkDiscoveryService.ScanNetworkAsync(
                        request.Target,
                        request.Ports,
                        request.FullScan,
                        cancellationToken);
                }
                else
                {
                    _logger.LogInformation("Starting host scan for {Target} with ports: {Ports}",
                        request.Target, request.Ports != null ? string.Join(",", request.Ports) : "default");

                    results = await networkDiscoveryService.ScanHostAsync(
                        request.Target,
                        request.Ports,
                        request.FullScan,
                        cancellationToken);
                }

                var scanEndTime = DateTime.UtcNow;
                var scanDuration = scanEndTime - scanStartTime;

                _logger.LogInformation("Scan completed for {ScanId} in {Duration}. Found {ResultCount} services",
                    request.ScanId, scanDuration, results.Count());

                // Store results and save each one immediately for real-time feedback
                var currentServiceKeys = new List<string>();
                var savedCount = 0;

                foreach (var result in results)
                {
                    if (cancellationToken.IsCancellationRequested)
                    {
                        _logger.LogWarning("Scan {ScanId} cancelled during result processing", request.ScanId);
                        break;
                    }

                    await SaveDiscoveredService(context, request.ScanId, result, currentServiceKeys);
                    savedCount++;

                    if (savedCount % 10 == 0) // Log every 10 saved services
                    {
                        _logger.LogInformation("Saved {SavedCount}/{TotalCount} services for scan {ScanId}",
                            savedCount, results.Count(), request.ScanId);
                    }
                }

                _logger.LogInformation("Finished saving {SavedCount} services for scan {ScanId}",
                    savedCount, request.ScanId);

                // Mark previously discovered services as inactive if they're no longer found
                await MarkServicesInactiveAsync(request.Target, currentServiceKeys);

                // Update scan completion with dedicated method
                await UpdateScanStatus(context, request.ScanId, "completed", DateTime.UtcNow);

                _logger.LogInformation(
                    "Completed scan {ScanId}. Status set to 'completed'. Found {ResultCount} services in {Duration}",
                    request.ScanId, results.Count(), scanDuration);
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Scan {ScanId} was cancelled", request.ScanId);
                await UpdateScanStatus(context, request.ScanId, "cancelled", DateTime.UtcNow, "Scan was cancelled");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing scan {ScanId}: {ErrorMessage}", request.ScanId, ex.Message);
                await UpdateScanStatus(context, request.ScanId, "failed", DateTime.UtcNow, ex.Message);
            }
        }
        finally
        {
            scope?.Dispose();
        }
    }

    private async Task UpdateScanStatus(ServicesDashboardContext context, Guid scanId, string status, DateTime? completedAt = null, string? errorMessage = null)
    {
        try
        {
            var scanSession = await context.NetworkScanSessions.FindAsync(scanId);
            if (scanSession != null)
            {
                scanSession.Status = status;
                if (completedAt.HasValue)
                {
                    scanSession.CompletedAt = completedAt.Value;
                }
                if (!string.IsNullOrEmpty(errorMessage))
                {
                    scanSession.ErrorMessage = errorMessage;
                }

                var changeCount = await context.SaveChangesAsync();
                _logger.LogInformation("Updated scan {ScanId} status to '{Status}'. Changes saved: {ChangeCount}", 
                    scanId, status, changeCount);

                // Verify the update was successful
                var verifySession = await context.NetworkScanSessions.FindAsync(scanId);
                if (verifySession?.Status != status)
                {
                    _logger.LogError("Status update verification failed for scan {ScanId}. Expected: {ExpectedStatus}, Actual: {ActualStatus}",
                        scanId, status, verifySession?.Status ?? "null");
                }
                else
                {
                    _logger.LogInformation("Status update verified for scan {ScanId}: {Status}", scanId, status);
                }
            }
            else
            {
                _logger.LogError("Could not find scan session {ScanId} to update status", scanId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update scan {ScanId} status to '{Status}'", scanId, status);
        }
    }

    private async Task SaveDiscoveredService(
        ServicesDashboardContext context,
        Guid scanId,
        DiscoveredServiceResult result,
        List<string> currentServiceKeys)
    {
        var serviceKey = $"{result.HostAddress}:{result.Port}";
        currentServiceKeys.Add(serviceKey);

        // Check if this service already exists for this scan
        var existing = await context.StoredDiscoveredServices
            .FirstOrDefaultAsync(s => s.ScanId == scanId && s.ServiceKey == serviceKey);

        if (existing != null)
        {
            // Update existing service
            existing.IsReachable = result.IsReachable;
            existing.ResponseTimeMs = (long)result.ResponseTime.TotalMilliseconds;
            existing.ServiceType = result.ServiceType;
            existing.Banner = result.Banner;
            existing.DiscoveredAt = result.DiscoveredAt;
            existing.IsActive = true;
        
            // Update AI recognition data
            existing.RecognizedName = result.RecognizedName;
            existing.SuggestedDescription = result.SuggestedDescription;
            existing.ServiceCategory = result.ServiceCategory;
            existing.SuggestedIcon = result.SuggestedIcon;
            existing.AiConfidence = result.AiConfidence;
        }
        else
        {
            // Create new service
            var storedService = new StoredDiscoveredService
            {
                ScanId = scanId,
                HostAddress = result.HostAddress,
                HostName = result.HostName,
                Port = result.Port,
                IsReachable = result.IsReachable,
                ResponseTimeMs = (long)result.ResponseTime.TotalMilliseconds,
                ServiceType = result.ServiceType,
                Banner = result.Banner,
                DiscoveredAt = result.DiscoveredAt,
                IsActive = true,
            
                // AI recognition data
                RecognizedName = result.RecognizedName,
                SuggestedDescription = result.SuggestedDescription,
                ServiceCategory = result.ServiceCategory,
                SuggestedIcon = result.SuggestedIcon,
                AiConfidence = result.AiConfidence
            };

            context.StoredDiscoveredServices.Add(storedService);
        }

        await context.SaveChangesAsync();
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