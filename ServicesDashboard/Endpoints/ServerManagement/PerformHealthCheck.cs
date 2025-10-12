using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class PerformHealthCheckRequest
{
    public int Id { get; set; }
}

public class PerformHealthCheckEndpoint : Endpoint<PerformHealthCheckRequest, ServerHealthCheck>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<PerformHealthCheckEndpoint> _logger;

    public PerformHealthCheckEndpoint(
        IServerManagementService serverManagementService,
        ILogger<PerformHealthCheckEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/servermanagement/{id}/health-check");
        AllowAnonymous();
    }

    public override async Task HandleAsync(PerformHealthCheckRequest req, CancellationToken ct)
    {
        try
        {
            var healthCheck = await _serverManagementService.PerformHealthCheckAsync(req.Id);
            if (healthCheck == null)
            {
                await Send.NotFoundAsync(ct);
            return;
            }

            await Send.OkAsync(healthCheck, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error performing health check for server {ServerId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
