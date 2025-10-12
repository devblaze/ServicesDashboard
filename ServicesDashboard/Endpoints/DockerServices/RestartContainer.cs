using FastEndpoints;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.DockerServices;

public class RestartContainerRequest
{
    public int ServerId { get; set; }
    public string ContainerId { get; set; } = string.Empty;
}

public class RestartContainerEndpoint : Endpoint<RestartContainerRequest>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<RestartContainerEndpoint> _logger;

    public RestartContainerEndpoint(
        IServerManagementService serverManagementService,
        ILogger<RestartContainerEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/dockerservices/{serverId}/containers/{containerId}/restart");
        AllowAnonymous();
    }

    public override async Task HandleAsync(RestartContainerRequest req, CancellationToken ct)
    {
        try
        {
            var success = await _serverManagementService.RestartDockerContainerAsync(req.ServerId, req.ContainerId);
            if (success)
            {
                await Send.OkAsync(ct);
            }
            else
            {
                HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsync(@"{""error"":""Failed to restart container""}", ct);
                return;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error restarting container {ContainerId} on server {ServerId}", req.ContainerId, req.ServerId);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
