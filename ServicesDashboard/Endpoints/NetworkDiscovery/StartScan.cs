using FastEndpoints;
using ServicesDashboard.Models.Requests;
using ServicesDashboard.Services.NetworkDiscovery;

namespace ServicesDashboard.Endpoints.NetworkDiscovery;

public class StartScanEndpoint : Endpoint<StartScanRequest>
{
    private readonly IBackgroundNetworkScanService _backgroundScanService;
    private readonly ILogger<StartScanEndpoint> _logger;

    public StartScanEndpoint(
        IBackgroundNetworkScanService backgroundScanService,
        ILogger<StartScanEndpoint> logger)
    {
        _backgroundScanService = backgroundScanService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/networkdiscovery/start-scan");
        AllowAnonymous();
    }

    public override async Task HandleAsync(StartScanRequest req, CancellationToken ct)
    {
        try
        {
            _logger.LogInformation("Starting background scan for {Target} ({ScanType})",
                req.Target, req.ScanType);

            var scanId = await _backgroundScanService.StartScanAsync(
                req.Target,
                req.ScanType,
                req.Ports,
                req.FullScan);

            await Send.OkAsync(new { scanId, message = "Scan started successfully" }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting scan for {Target}", req.Target);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Error starting scan""}", ct);
            return;
        }
    }
}
