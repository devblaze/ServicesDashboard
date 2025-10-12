using FastEndpoints;
using ServicesDashboard.Models.Results;
using ServicesDashboard.Services.LogCollection;

namespace ServicesDashboard.Endpoints.RemoteLogs;

public class GetContainersRequest
{
    public string ServerId { get; set; } = string.Empty;
}

public class GetContainersEndpoint : Endpoint<GetContainersRequest, IEnumerable<RemoteContainerResult>>
{
    private readonly IRemoteLogCollector _logCollector;
    private readonly ILogger<GetContainersEndpoint> _logger;

    public GetContainersEndpoint(
        IRemoteLogCollector logCollector,
        ILogger<GetContainersEndpoint> logger)
    {
        _logCollector = logCollector;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/remotelogs/servers/{serverId}/containers");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetContainersRequest req, CancellationToken ct)
    {
        try
        {
            var containers = await _logCollector.ListContainersAsync(req.ServerId);
            await Send.OkAsync(containers, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting containers for server {ServerId}", req.ServerId);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync($@"{{""error"":""Failed to get containers: {ex.Message.Replace("\"", "\\\"")}""}}", ct);
            return;
        }
    }
}
