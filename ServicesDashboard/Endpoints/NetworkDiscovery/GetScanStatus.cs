using FastEndpoints;
using ServicesDashboard.Services.NetworkDiscovery;

namespace ServicesDashboard.Endpoints.NetworkDiscovery;

public class GetScanStatusRequest
{
    public Guid ScanId { get; set; }
}

public class GetScanStatusEndpoint : Endpoint<GetScanStatusRequest>
{
    private readonly IBackgroundNetworkScanService _backgroundScanService;
    private readonly ILogger<GetScanStatusEndpoint> _logger;

    public GetScanStatusEndpoint(
        IBackgroundNetworkScanService backgroundScanService,
        ILogger<GetScanStatusEndpoint> logger)
    {
        _backgroundScanService = backgroundScanService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/networkdiscovery/scan-status/{scanId}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetScanStatusRequest req, CancellationToken ct)
    {
        try
        {
            var scanSession = await _backgroundScanService.GetScanStatusAsync(req.ScanId);
            if (scanSession == null)
            {
                HttpContext.Response.StatusCode = 404;
                await HttpContext.Response.WriteAsync(@"{""error"":""Scan not found""}", ct);
                return;
            }

            await Send.OkAsync(new
            {
                scanId = scanSession.Id,
                target = scanSession.Target,
                scanType = scanSession.ScanType,
                status = scanSession.Status,
                startedAt = scanSession.StartedAt,
                completedAt = scanSession.CompletedAt,
                serviceCount = scanSession.DiscoveredServices.Count,
                errorMessage = scanSession.ErrorMessage
            }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting scan status for {ScanId}", req.ScanId);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Error getting scan status""}", ct);
            return;
        }
    }
}
