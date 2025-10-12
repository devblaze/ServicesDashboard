using FastEndpoints;
using ServicesDashboard.Models.Results;
using ServicesDashboard.Services.LogCollection;

namespace ServicesDashboard.Endpoints.RemoteLogs;

public class GetContainerStatsRequest
{
    public string ServerId { get; set; } = string.Empty;
    public string ContainerId { get; set; } = string.Empty;
}

public class GetContainerStatsEndpoint : Endpoint<GetContainerStatsRequest, ContainerStatsResult>
{
    private readonly IRemoteLogCollector _logCollector;
    private readonly ILogger<GetContainerStatsEndpoint> _logger;

    public GetContainerStatsEndpoint(
        IRemoteLogCollector logCollector,
        ILogger<GetContainerStatsEndpoint> logger)
    {
        _logCollector = logCollector;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/remotelogs/servers/{serverId}/containers/{containerId}/stats");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetContainerStatsRequest req, CancellationToken ct)
    {
        try
        {
            var stats = await _logCollector.GetContainerStatsAsync(req.ServerId, req.ContainerId);
            await Send.OkAsync(stats, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting stats for container {ContainerId} on server {ServerId}", req.ContainerId, req.ServerId);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync($@"{{""error"":""Failed to get container stats: {ex.Message.Replace("\"", "\\\"")}""}}", ct);
            return;
        }
    }
}
