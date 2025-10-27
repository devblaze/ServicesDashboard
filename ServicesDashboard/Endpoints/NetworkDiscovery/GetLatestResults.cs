using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.NetworkDiscovery;

namespace ServicesDashboard.Endpoints.NetworkDiscovery;

public class GetLatestResultsRequest
{
    public string Target { get; set; } = string.Empty;
    public string SortBy { get; set; } = "ip";
    public string SortOrder { get; set; } = "asc";
}

public class GetLatestResultsEndpoint : Endpoint<GetLatestResultsRequest, IEnumerable<StoredDiscoveredService>>
{
    private readonly IBackgroundNetworkScanService _backgroundScanService;
    private readonly ILogger<GetLatestResultsEndpoint> _logger;

    public GetLatestResultsEndpoint(
        IBackgroundNetworkScanService backgroundScanService,
        ILogger<GetLatestResultsEndpoint> logger)
    {
        _backgroundScanService = backgroundScanService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/networkdiscovery/latest-results/{target}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetLatestResultsRequest req, CancellationToken ct)
    {
        try
        {
            var results = await _backgroundScanService.GetLatestDiscoveredServicesAsync(req.Target, req.SortBy, req.SortOrder);
            await Send.OkAsync(results, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting latest results for {Target}", req.Target);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Error getting latest results""}", ct);
            return;
        }
    }
}
