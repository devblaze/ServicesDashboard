using FastEndpoints;

namespace ServicesDashboard.Endpoints.NetworkDiscovery;

public class GetScanQueueDebugEndpoint : EndpointWithoutRequest
{
    private readonly ILogger<GetScanQueueDebugEndpoint> _logger;

    public GetScanQueueDebugEndpoint(ILogger<GetScanQueueDebugEndpoint> logger)
    {
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/networkdiscovery/debug/scan-queue");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        try
        {
            // This will help us see if scans are being processed
            await Send.OkAsync(new
            {
                message = "Check application logs for background scan service activity",
                timestamp = DateTime.UtcNow,
                suggestion = "Look for log entries with 'BackgroundNetworkScan' in the name"
            }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting debug info");
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Error getting debug info""}", ct);
            return;
        }
    }
}
