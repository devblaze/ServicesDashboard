using FastEndpoints;
using ServicesDashboard.Services.LogCollection;

namespace ServicesDashboard.Endpoints.RemoteLogs;

public class GetContainerLogsRequest
{
    public string ServerId { get; set; } = string.Empty;
    public string ContainerId { get; set; } = string.Empty;
    public int Lines { get; set; } = 100;
}

public class GetContainerLogsEndpoint : Endpoint<GetContainerLogsRequest, string>
{
    private readonly IRemoteLogCollector _logCollector;
    private readonly ILogger<GetContainerLogsEndpoint> _logger;

    public GetContainerLogsEndpoint(
        IRemoteLogCollector logCollector,
        ILogger<GetContainerLogsEndpoint> logger)
    {
        _logCollector = logCollector;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/remotelogs/servers/{serverId}/containers/{containerId}/logs");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetContainerLogsRequest req, CancellationToken ct)
    {
        try
        {
            var logs = await _logCollector.GetContainerLogsAsync(req.ServerId, req.ContainerId, req.Lines);
            await Send.OkAsync(logs, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting logs for container {ContainerId} on server {ServerId}", req.ContainerId, req.ServerId);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync($@"{{""error"":""Failed to get container logs: {ex.Message.Replace("\"", "\\\"")}""}}", ct);
            return;
        }
    }
}
