using FastEndpoints;
using ServicesDashboard.Services.LogCollection;

namespace ServicesDashboard.Endpoints.RemoteLogs;

public class StopContainerRequest
{
    public string ServerId { get; set; } = string.Empty;
    public string ContainerId { get; set; } = string.Empty;
}

public class StopContainerEndpoint : Endpoint<StopContainerRequest, bool>
{
    private readonly IRemoteLogCollector _logCollector;
    private readonly ILogger<StopContainerEndpoint> _logger;

    public StopContainerEndpoint(
        IRemoteLogCollector logCollector,
        ILogger<StopContainerEndpoint> logger)
    {
        _logCollector = logCollector;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/remotelogs/servers/{serverId}/containers/{containerId}/stop");
        AllowAnonymous();
    }

    public override async Task HandleAsync(StopContainerRequest req, CancellationToken ct)
    {
        try
        {
            var result = await _logCollector.StopContainerAsync(req.ServerId, req.ContainerId);
            await Send.OkAsync(result, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error stopping container {ContainerId} on server {ServerId}", req.ContainerId, req.ServerId);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync($@"{{""error"":""Failed to stop container: {ex.Message.Replace("\"", "\\\"")}""}}", ct);
            return;
        }
    }
}
