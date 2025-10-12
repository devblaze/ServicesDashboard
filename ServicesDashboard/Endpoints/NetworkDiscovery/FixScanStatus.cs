using FastEndpoints;
using Microsoft.Extensions.DependencyInjection;
using ServicesDashboard.Data;
using ServicesDashboard.Services.NetworkDiscovery;

namespace ServicesDashboard.Endpoints.NetworkDiscovery;

public class FixScanStatusRequest
{
    public Guid ScanId { get; set; }
}

public class FixScanStatusEndpoint : Endpoint<FixScanStatusRequest>
{
    private readonly IBackgroundNetworkScanService _backgroundScanService;
    private readonly ILogger<FixScanStatusEndpoint> _logger;
    private readonly IServiceProvider _serviceProvider;

    public FixScanStatusEndpoint(
        IBackgroundNetworkScanService backgroundScanService,
        ILogger<FixScanStatusEndpoint> logger,
        IServiceProvider serviceProvider)
    {
        _backgroundScanService = backgroundScanService;
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    public override void Configure()
    {
        Post("/api/networkdiscovery/debug/fix-scan-status/{scanId}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(FixScanStatusRequest req, CancellationToken ct)
    {
        try
        {
            _logger.LogInformation("Attempting to fix scan status for {ScanId}", req.ScanId);

            var scanSession = await _backgroundScanService.GetScanStatusAsync(req.ScanId);
            if (scanSession == null)
            {
                HttpContext.Response.StatusCode = 404;
                await HttpContext.Response.WriteAsync(@"{""error"":""Scan not found""}", ct);
                return;
            }

            var discoveredServices = await _backgroundScanService.GetScanResultsAsync(req.ScanId);
            var serviceCount = discoveredServices.Count();

            // If we have results but status is still pending/running, fix it
            if (serviceCount > 0 && (scanSession.Status == "pending" || scanSession.Status == "running"))
            {
                using var scope = _serviceProvider.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();

                var dbScan = await context.NetworkScanSessions.FindAsync(new object[] { req.ScanId }, ct);
                if (dbScan != null)
                {
                    dbScan.Status = "completed";
                    dbScan.CompletedAt = DateTime.UtcNow;
                    await context.SaveChangesAsync(ct);

                    _logger.LogInformation("Fixed scan {ScanId} status to completed", req.ScanId);

                    await Send.OkAsync(new
                    {
                        message = "Scan status fixed",
                        scanId = req.ScanId,
                        newStatus = "completed",
                        serviceCount = serviceCount,
                        fixedAt = DateTime.UtcNow
                    }, ct);
                    return;
                }
            }

            await Send.OkAsync(new
            {
                message = "No fix needed",
                scanId = req.ScanId,
                currentStatus = scanSession.Status,
                serviceCount = serviceCount
            }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fixing scan status for {ScanId}", req.ScanId);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Error fixing scan status""}", ct);
            return;
        }
    }
}
