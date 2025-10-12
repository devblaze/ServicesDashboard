using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class GetServersEndpoint : EndpointWithoutRequest<IEnumerable<ManagedServer>>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<GetServersEndpoint> _logger;

    public GetServersEndpoint(
        IServerManagementService serverManagementService,
        ILogger<GetServersEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/servermanagement");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        try
        {
            var servers = await _serverManagementService.GetServersAsync();
            await Send.OkAsync(servers, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting servers");
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
