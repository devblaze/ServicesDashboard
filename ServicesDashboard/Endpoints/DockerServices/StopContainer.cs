using FastEndpoints;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.DockerServices;

public class StopContainerRequest
{
    public int ServerId { get; set; }
    public string ContainerId { get; set; } = string.Empty;
}

public class StopContainerEndpoint : Endpoint<StopContainerRequest>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<StopContainerEndpoint> _logger;

    public StopContainerEndpoint(
        IServerManagementService serverManagementService,
        ILogger<StopContainerEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/dockerservices/{serverId}/containers/{containerId}/stop");
        AllowAnonymous();
    }

    public override async Task HandleAsync(StopContainerRequest req, CancellationToken ct)
    {
        try
        {
            var success = await _serverManagementService.StopDockerContainerAsync(req.ServerId, req.ContainerId);
            if (success)
            {
                await Send.OkAsync(ct);
            }
            else
            {
                HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsync(@"{""error"":""Failed to stop container""}", ct);
                return;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error stopping container {ContainerId} on server {ServerId}", req.ContainerId, req.ServerId);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
