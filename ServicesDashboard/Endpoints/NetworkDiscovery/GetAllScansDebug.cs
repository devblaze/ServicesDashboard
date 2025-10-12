using FastEndpoints;
using ServicesDashboard.Services.NetworkDiscovery;

namespace ServicesDashboard.Endpoints.NetworkDiscovery;

public class GetAllScansDebugEndpoint : EndpointWithoutRequest
{
    private readonly IBackgroundNetworkScanService _backgroundScanService;
    private readonly ILogger<GetAllScansDebugEndpoint> _logger;

    public GetAllScansDebugEndpoint(
        IBackgroundNetworkScanService backgroundScanService,
        ILogger<GetAllScansDebugEndpoint> logger)
    {
        _backgroundScanService = backgroundScanService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/networkdiscovery/debug/all-scans");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        try
        {
            var scans = await _backgroundScanService.GetRecentScansAsync(50);
            await Send.OkAsync(new
            {
                totalScans = scans.Count(),
                scans = scans.Select(s => new
                {
                    scanId = s.Id,
                    target = s.Target,
                    status = s.Status,
                    startedAt = s.StartedAt,
                    completedAt = s.CompletedAt,
                    errorMessage = s.ErrorMessage,
                    servicesCount = s.DiscoveredServices?.Count ?? 0
                })
            }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all scans debug info");
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Error getting all scans debug info""}", ct);
            return;
        }
    }
}
