using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.NetworkDiscovery;

namespace ServicesDashboard.Endpoints.NetworkDiscovery;

public class GetRecentScansRequest
{
    public int Limit { get; set; } = 10;
}

public class GetRecentScansEndpoint : Endpoint<GetRecentScansRequest, IEnumerable<NetworkScanSession>>
{
    private readonly IBackgroundNetworkScanService _backgroundScanService;
    private readonly ILogger<GetRecentScansEndpoint> _logger;

    public GetRecentScansEndpoint(
        IBackgroundNetworkScanService backgroundScanService,
        ILogger<GetRecentScansEndpoint> logger)
    {
        _backgroundScanService = backgroundScanService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/networkdiscovery/recent-scans");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetRecentScansRequest req, CancellationToken ct)
    {
        try
        {
            var scans = await _backgroundScanService.GetRecentScansAsync(req.Limit);
            await Send.OkAsync(scans, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recent scans");
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Error getting recent scans""}", ct);
            return;
        }
    }
}
