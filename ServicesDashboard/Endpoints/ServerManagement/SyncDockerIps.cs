using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class SyncDockerIpsRequest
{
    public int Id { get; set; }
}

public class SyncDockerIpsEndpoint : Endpoint<SyncDockerIpsRequest, DockerIpSyncResult>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<SyncDockerIpsEndpoint> _logger;

    public SyncDockerIpsEndpoint(
        IServerManagementService serverManagementService,
        ILogger<SyncDockerIpsEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/servermanagement/{id}/sync-docker-ips");
        AllowAnonymous();
    }

    public override async Task HandleAsync(SyncDockerIpsRequest req, CancellationToken ct)
    {
        try
        {
            var result = await _serverManagementService.SyncDockerContainerIpsAsync(req.Id);

            if (result.Success)
            {
                await Send.OkAsync(result, ct);
            }
            else
            {
                HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsync($@"{{""error"":""{result.ErrorMessage}""}}", ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to sync Docker IPs for server {ServerId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Failed to sync Docker container IPs""}", ct);
            return;
        }
    }
}
