using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.NetworkDiscovery;

namespace ServicesDashboard.Endpoints.NetworkDiscovery;

public class GetScanResultsRequest
{
    public Guid ScanId { get; set; }
    public string SortBy { get; set; } = "ip";
    public string SortOrder { get; set; } = "asc";
}

public class GetScanResultsEndpoint : Endpoint<GetScanResultsRequest, IEnumerable<StoredDiscoveredService>>
{
    private readonly IBackgroundNetworkScanService _backgroundScanService;
    private readonly ILogger<GetScanResultsEndpoint> _logger;

    public GetScanResultsEndpoint(
        IBackgroundNetworkScanService backgroundScanService,
        ILogger<GetScanResultsEndpoint> logger)
    {
        _backgroundScanService = backgroundScanService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/networkdiscovery/scan-results/{scanId}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetScanResultsRequest req, CancellationToken ct)
    {
        try
        {
            var results = await _backgroundScanService.GetScanResultsAsync(req.ScanId, req.SortBy, req.SortOrder);
            await Send.OkAsync(results, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting scan results for {ScanId}", req.ScanId);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Error getting scan results""}", ct);
            return;
        }
    }
}
