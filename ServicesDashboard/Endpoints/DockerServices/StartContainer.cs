using FastEndpoints;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.DockerServices;

public class StartContainerRequest
{
    public int ServerId { get; set; }
    public string ContainerId { get; set; } = string.Empty;
}

public class StartContainerEndpoint : Endpoint<StartContainerRequest>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<StartContainerEndpoint> _logger;

    public StartContainerEndpoint(
        IServerManagementService serverManagementService,
        ILogger<StartContainerEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/dockerservices/{serverId}/containers/{containerId}/start");
        AllowAnonymous();
    }

    public override async Task HandleAsync(StartContainerRequest req, CancellationToken ct)
    {
        try
        {
            var success = await _serverManagementService.StartDockerContainerAsync(req.ServerId, req.ContainerId);
            if (success)
            {
                await Send.OkAsync(ct);
            }
            else
            {
                HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsync(@"{""error"":""Failed to start container""}", ct);
                return;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting container {ContainerId} on server {ServerId}", req.ContainerId, req.ServerId);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
