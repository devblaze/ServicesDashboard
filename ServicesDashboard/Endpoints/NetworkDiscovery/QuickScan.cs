using FastEndpoints;
using ServicesDashboard.Models.Requests;
using ServicesDashboard.Models.Results;
using ServicesDashboard.Services.NetworkDiscovery;

namespace ServicesDashboard.Endpoints.NetworkDiscovery;

public class QuickScanEndpoint : Endpoint<QuickScanRequest, IEnumerable<DiscoveredServiceResult>>
{
    private readonly INetworkDiscoveryService _networkDiscoveryService;
    private readonly ILogger<QuickScanEndpoint> _logger;

    public QuickScanEndpoint(
        INetworkDiscoveryService networkDiscoveryService,
        ILogger<QuickScanEndpoint> logger)
    {
        _networkDiscoveryService = networkDiscoveryService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/networkdiscovery/quick-scan");
        AllowAnonymous();
    }

    public override async Task HandleAsync(QuickScanRequest req, CancellationToken ct)
    {
        try
        {
            _logger.LogInformation("Starting quick scan for {Target}", req.Target);

            // Use a shorter timeout for quick scans
            using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(2));

            var isNetwork = req.Target.Contains('/') || req.Target.Contains('-');

            IEnumerable<DiscoveredServiceResult> services;
            if (isNetwork)
            {
                // For network quick scans, limit to common ports only
                services = await _networkDiscoveryService.ScanNetworkAsync(
                    req.Target,
                    ports: _networkDiscoveryService.GetCommonPorts(),
                    fullScan: false,
                    cts.Token);
            }
            else
            {
                services = await _networkDiscoveryService.ScanHostAsync(
                    req.Target,
                    ports: _networkDiscoveryService.GetCommonPorts(),
                    fullScan: false,
                    cts.Token);
            }

            _logger.LogInformation("Quick scan completed. Found {ServiceCount} services", services.Count());
            await Send.OkAsync(services, ct);
        }
        catch (OperationCanceledException)
        {
            HttpContext.Response.StatusCode = 408;
                await HttpContext.Response.WriteAsync(@"{""error"":""Quick scan timed out - use background scan for larger operations""}", ct);
                return;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during quick scan for {Target}", req.Target);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Error during quick scan""}", ct);
            return;
        }
    }
}
