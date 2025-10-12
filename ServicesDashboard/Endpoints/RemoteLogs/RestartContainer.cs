using FastEndpoints;
using ServicesDashboard.Services.LogCollection;

namespace ServicesDashboard.Endpoints.RemoteLogs;

public class RestartContainerRequest
{
    public string ServerId { get; set; } = string.Empty;
    public string ContainerId { get; set; } = string.Empty;
}

public class RestartContainerEndpoint : Endpoint<RestartContainerRequest, bool>
{
    private readonly IRemoteLogCollector _logCollector;
    private readonly ILogger<RestartContainerEndpoint> _logger;

    public RestartContainerEndpoint(
        IRemoteLogCollector logCollector,
        ILogger<RestartContainerEndpoint> logger)
    {
        _logCollector = logCollector;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/remotelogs/servers/{serverId}/containers/{containerId}/restart");
        AllowAnonymous();
    }

    public override async Task HandleAsync(RestartContainerRequest req, CancellationToken ct)
    {
        try
        {
            var result = await _logCollector.RestartContainerAsync(req.ServerId, req.ContainerId);
            await Send.OkAsync(result, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error restarting container {ContainerId} on server {ServerId}", req.ContainerId, req.ServerId);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync($@"{{""error"":""Failed to restart container: {ex.Message.Replace("\"", "\\\"")}""}}", ct);
            return;
        }
    }
}
