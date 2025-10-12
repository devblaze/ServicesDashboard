using FastEndpoints;
using ServicesDashboard.Services.LogCollection;

namespace ServicesDashboard.Endpoints.RemoteLogs;

public class StartContainerRequest
{
    public string ServerId { get; set; } = string.Empty;
    public string ContainerId { get; set; } = string.Empty;
}

public class StartContainerEndpoint : Endpoint<StartContainerRequest, bool>
{
    private readonly IRemoteLogCollector _logCollector;
    private readonly ILogger<StartContainerEndpoint> _logger;

    public StartContainerEndpoint(
        IRemoteLogCollector logCollector,
        ILogger<StartContainerEndpoint> logger)
    {
        _logCollector = logCollector;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/remotelogs/servers/{serverId}/containers/{containerId}/start");
        AllowAnonymous();
    }

    public override async Task HandleAsync(StartContainerRequest req, CancellationToken ct)
    {
        try
        {
            var result = await _logCollector.StartContainerAsync(req.ServerId, req.ContainerId);
            await Send.OkAsync(result, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting container {ContainerId} on server {ServerId}", req.ContainerId, req.ServerId);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync($@"{{""error"":""Failed to start container: {ex.Message.Replace("\"", "\\\"")}""}}", ct);
            return;
        }
    }
}
