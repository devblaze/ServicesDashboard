using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Results;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class GetDockerServicesRequest
{
    public int Id { get; set; }
}

public class GetDockerServicesEndpoint : Endpoint<GetDockerServicesRequest, DockerServiceDiscoveryResult>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<GetDockerServicesEndpoint> _logger;

    public GetDockerServicesEndpoint(
        IServerManagementService serverManagementService,
        ILogger<GetDockerServicesEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/servermanagement/{id}/docker-services");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetDockerServicesRequest req, CancellationToken ct)
    {
        try
        {
            var result = await _serverManagementService.DiscoverDockerServicesAsync(req.Id);
            await Send.OkAsync(result, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to discover Docker services for server {ServerId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Failed to discover Docker services""}", ct);
            return;
        }
    }
}
