using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;
using ServicesDashboard.Hubs;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Results;

namespace ServicesDashboard.Services.NetworkDiscovery;

public interface IBackgroundNetworkScanService
{
    Task<Guid> StartScanAsync(string target, string scanType, int[]? ports = null, bool fullScan = false);
    Task<NetworkScanSession?> GetScanStatusAsync(Guid scanId);
    Task<IEnumerable<NetworkScanSession>> GetRecentScansAsync(int limit = 10);
    Task<IEnumerable<StoredDiscoveredService>> GetScanResultsAsync(Guid scanId, string sortBy = "ip", string sortOrder = "asc");
    Task<IEnumerable<StoredDiscoveredService>> GetLatestDiscoveredServicesAsync(string target, string sortBy = "ip", string sortOrder = "asc");
    Task MarkServicesInactiveAsync(string target, IEnumerable<string> currentServiceKeys);
}

public class BackgroundNetworkScan : BackgroundService, IBackgroundNetworkScanService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<BackgroundNetworkScan> _logger;
    private readonly IHubContext<DiscoveryNotificationHub, IDiscoveryNotificationClient> _hubContext;
    private readonly Queue<ScanRequest> _scanQueue = new();
    private readonly SemaphoreSlim _queueSemaphore = new(1, 1);

    public BackgroundNetworkScan(
        IServiceProvider serviceProvider,
        ILogger<BackgroundNetworkScan> logger,
        IHubContext<DiscoveryNotificationHub, IDiscoveryNotificationClient> hubContext)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _hubContext = hubContext;
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

        // Send notification that scan has started
        await _hubContext.Clients.All.ReceiveScanStarted(scanSession.Id, target, scanType);

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

    public async Task<IEnumerable<StoredDiscoveredService>> GetScanResultsAsync(Guid scanId, string sortBy = "ip", string sortOrder = "asc")
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();

        var query = context.StoredDiscoveredServices
            .Where(s => s.ScanId == scanId)
            .AsQueryable();

        // Apply sorting
        query = ApplySorting(query, sortBy, sortOrder);

        return await query.ToListAsync();
    }

    public async Task<IEnumerable<StoredDiscoveredService>> GetLatestDiscoveredServicesAsync(string target, string sortBy = "ip", string sortOrder = "asc")
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

        var query = context.StoredDiscoveredServices
            .Where(s => s.ScanId == latestScan.Id)
            .AsQueryable();

        // Apply sorting
        query = ApplySorting(query, sortBy, sortOrder);

        return await query.ToListAsync();
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

                // Send notification that scan is now running
                await _hubContext.Clients.All.ReceiveScanProgress(request.ScanId, 0, "Scan started, discovering services...");

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

                var totalResults = results.Count();
                foreach (var result in results)
                {
                    if (cancellationToken.IsCancellationRequested)
                    {
                        _logger.LogWarning("Scan {ScanId} cancelled during result processing", request.ScanId);
                        break;
                    }

                    await SaveDiscoveredService(context, request.ScanId, result, currentServiceKeys);
                    savedCount++;

                    // Send notification for each discovered service
                    await _hubContext.Clients.All.ReceiveServiceDiscovered(
                        request.ScanId,
                        result.HostAddress ?? "Unknown",
                        result.Port,
                        result.RecognizedName ?? "Unknown Service");

                    // Send progress update periodically
                    if (savedCount % 10 == 0 || savedCount == totalResults)
                    {
                        var progress = (int)((savedCount * 100) / Math.Max(totalResults, 1));
                        await _hubContext.Clients.All.ReceiveScanProgress(
                            request.ScanId,
                            progress,
                            $"Discovered {savedCount}/{totalResults} services");

                        _logger.LogInformation("Saved {SavedCount}/{TotalCount} services for scan {ScanId}",
                            savedCount, totalResults, request.ScanId);
                    }
                }

                _logger.LogInformation("Finished saving {SavedCount} services for scan {ScanId}",
                    savedCount, request.ScanId);

                // Mark previously discovered services as inactive if they're no longer found
                await MarkServicesInactiveAsync(request.Target, currentServiceKeys);

                // Update scan completion with dedicated method
                await UpdateScanStatus(context, request.ScanId, "completed", DateTime.UtcNow);

                // Send completion notification
                var distinctHosts = results.Select(r => r.HostAddress).Distinct().Count();
                await _hubContext.Clients.All.ReceiveScanCompleted(request.ScanId, distinctHosts, totalResults);

                _logger.LogInformation(
                    "Completed scan {ScanId}. Status set to 'completed'. Found {ResultCount} services in {Duration}",
                    request.ScanId, totalResults, scanDuration);
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Scan {ScanId} was cancelled", request.ScanId);
                await UpdateScanStatus(context, request.ScanId, "cancelled", DateTime.UtcNow, "Scan was cancelled");
                await _hubContext.Clients.All.ReceiveScanError(request.ScanId, "Scan was cancelled");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing scan {ScanId}: {ErrorMessage}", request.ScanId, ex.Message);
                await UpdateScanStatus(context, request.ScanId, "failed", DateTime.UtcNow, ex.Message);
                await _hubContext.Clients.All.ReceiveScanError(request.ScanId, $"Scan failed: {ex.Message}");
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

        // Sanitize string data to remove null bytes and non-UTF-8 characters
        var sanitizedBanner = SanitizeStringForDatabase(result.Banner);
        var sanitizedRecognizedName = SanitizeStringForDatabase(result.RecognizedName);
        var sanitizedDescription = SanitizeStringForDatabase(result.SuggestedDescription);
        var sanitizedServiceCategory = SanitizeStringForDatabase(result.ServiceCategory);
        var sanitizedSuggestedIcon = SanitizeStringForDatabase(result.SuggestedIcon);
        var sanitizedServiceType = SanitizeStringForDatabase(result.ServiceType);
        var sanitizedHostName = SanitizeStringForDatabase(result.HostName);

        _logger.LogInformation("Saving service {ServiceKey} with AI data: {RecognizedName}", 
            serviceKey, sanitizedRecognizedName ?? "NULL");

        // Check if this service already exists for this scan
        var existing = await context.StoredDiscoveredServices
            .FirstOrDefaultAsync(s => s.ScanId == scanId && s.ServiceKey == serviceKey);

        if (existing != null)
        {
            // Update existing service
            existing.IsReachable = result.IsReachable;
            existing.ResponseTimeMs = (long)result.ResponseTime.TotalMilliseconds;
            existing.ServiceType = sanitizedServiceType;
            existing.Banner = sanitizedBanner;
            existing.DiscoveredAt = result.DiscoveredAt;
            existing.IsActive = true;
        
            // Update AI recognition data
            existing.RecognizedName = sanitizedRecognizedName;
            existing.SuggestedDescription = sanitizedDescription;
            existing.ServiceCategory = sanitizedServiceCategory;
            existing.SuggestedIcon = sanitizedSuggestedIcon;
            existing.AiConfidence = result.AiConfidence;
        }
        else
        {
            // Create new service
            var storedService = new StoredDiscoveredService
            {
                ScanId = scanId,
                HostAddress = result.HostAddress,
                HostName = sanitizedHostName,
                Port = result.Port,
                IsReachable = result.IsReachable,
                ResponseTimeMs = (long)result.ResponseTime.TotalMilliseconds,
                ServiceType = sanitizedServiceType,
                Banner = sanitizedBanner,
                DiscoveredAt = result.DiscoveredAt,
                IsActive = true,
                ServiceKey = serviceKey,
        
                // AI recognition data
                RecognizedName = sanitizedRecognizedName,
                SuggestedDescription = sanitizedDescription,
                ServiceCategory = sanitizedServiceCategory,
                SuggestedIcon = sanitizedSuggestedIcon,
                AiConfidence = result.AiConfidence
            };

            context.StoredDiscoveredServices.Add(storedService);
        }

        await context.SaveChangesAsync();
    }

    private static IQueryable<StoredDiscoveredService> ApplySorting(
        IQueryable<StoredDiscoveredService> query,
        string sortBy,
        string sortOrder)
    {
        // Sort by IP addresses numerically (not alphabetically)
        if (sortBy.Equals("ip", StringComparison.OrdinalIgnoreCase))
        {
            if (sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase))
            {
                // For descending: Sort by each octet in reverse
                return query
                    .OrderByDescending(s => ConvertIpToSortableString(s.HostAddress))
                    .ThenByDescending(s => s.Port);
            }
            else
            {
                // For ascending: Sort by each octet
                return query
                    .OrderBy(s => ConvertIpToSortableString(s.HostAddress))
                    .ThenBy(s => s.Port);
            }
        }
        // Sort by port
        else if (sortBy.Equals("port", StringComparison.OrdinalIgnoreCase))
        {
            if (sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase))
            {
                return query
                    .OrderByDescending(s => s.Port)
                    .ThenBy(s => ConvertIpToSortableString(s.HostAddress));
            }
            else
            {
                return query
                    .OrderBy(s => s.Port)
                    .ThenBy(s => ConvertIpToSortableString(s.HostAddress));
            }
        }
        // Sort by response time
        else if (sortBy.Equals("responseTime", StringComparison.OrdinalIgnoreCase))
        {
            if (sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase))
            {
                return query
                    .OrderByDescending(s => s.ResponseTimeMs)
                    .ThenBy(s => ConvertIpToSortableString(s.HostAddress));
            }
            else
            {
                return query
                    .OrderBy(s => s.ResponseTimeMs)
                    .ThenBy(s => ConvertIpToSortableString(s.HostAddress));
            }
        }
        // Default: sort by IP ascending
        else
        {
            return query
                .OrderBy(s => ConvertIpToSortableString(s.HostAddress))
                .ThenBy(s => s.Port);
        }
    }

    /// <summary>
    /// Converts an IP address to a sortable string format.
    /// Pads each octet to 3 digits so sorting works correctly: "192.168.001.001"
    /// </summary>
    private static string ConvertIpToSortableString(string ipAddress)
    {
        try
        {
            // Try to parse as IPv4
            var parts = ipAddress.Split('.');
            if (parts.Length == 4)
            {
                // Pad each octet to 3 digits
                return string.Join(".", parts.Select(p =>
                {
                    if (int.TryParse(p, out var octet))
                        return octet.ToString("000");
                    return p.PadLeft(3, '0');
                }));
            }

            // If not IPv4, return as-is (handles hostnames, IPv6, etc.)
            return ipAddress;
        }
        catch
        {
            return ipAddress;
        }
    }

    // Add this helper method to the BackgroundNetworkScan class
    private static string? SanitizeStringForDatabase(string? input)
    {
        if (string.IsNullOrEmpty(input))
            return input;

        try
        {
            // Remove null bytes and other problematic characters
            var sanitized = input
                .Replace("\0", "") // Remove null bytes
                .Replace("\x00", "") // Remove null bytes (alternative format)
                .Trim();

            // Remove other control characters except common ones like \n, \r, \t
            var cleanedChars = sanitized
                .Where(c => !char.IsControl(c) || c == '\n' || c == '\r' || c == '\t')
                .ToArray();

            var result = new string(cleanedChars);

            // Truncate if too long (optional safety measure)
            if (result.Length > 1000)
            {
                result = result.Substring(0, 1000) + "...";
            }

            return string.IsNullOrWhiteSpace(result) ? null : result;
        }
        catch (Exception)
        {
            // If sanitization fails, return null or a safe default
            return null;
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