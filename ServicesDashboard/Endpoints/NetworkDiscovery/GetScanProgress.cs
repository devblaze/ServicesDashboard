using FastEndpoints;
using ServicesDashboard.Services.NetworkDiscovery;

namespace ServicesDashboard.Endpoints.NetworkDiscovery;

public class GetScanProgressRequest
{
    public Guid ScanId { get; set; }
}

public class GetScanProgressEndpoint : Endpoint<GetScanProgressRequest>
{
    private readonly IBackgroundNetworkScanService _backgroundScanService;
    private readonly ILogger<GetScanProgressEndpoint> _logger;

    public GetScanProgressEndpoint(
        IBackgroundNetworkScanService backgroundScanService,
        ILogger<GetScanProgressEndpoint> logger)
    {
        _backgroundScanService = backgroundScanService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/networkdiscovery/scan-progress/{scanId}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetScanProgressRequest req, CancellationToken ct)
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

            // Get real-time count of discovered services
            var discoveredServices = await _backgroundScanService.GetScanResultsAsync(req.ScanId);

            await Send.OkAsync(new
            {
                scanId = scanSession.Id,
                target = scanSession.Target,
                scanType = scanSession.ScanType,
                status = scanSession.Status,
                startedAt = scanSession.StartedAt,
                completedAt = scanSession.CompletedAt,
                discoveredCount = discoveredServices.Count(),
                latestServices = discoveredServices
                    .OrderByDescending(s => s.DiscoveredAt)
                    .Take(5) // Show latest 5 discovered services
                    .Select(s => new
                    {
                        hostAddress = s.HostAddress,
                        port = s.Port,
                        serviceType = s.ServiceType,
                        discoveredAt = s.DiscoveredAt
                    }),
                errorMessage = scanSession.ErrorMessage
            }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting scan progress for {ScanId}", req.ScanId);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Error getting scan progress""}", ct);
            return;
        }
    }
}
