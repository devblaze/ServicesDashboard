using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class GetServerRequest
{
    public int Id { get; set; }
}

public class GetServerEndpoint : Endpoint<GetServerRequest, ManagedServer>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<GetServerEndpoint> _logger;

    public GetServerEndpoint(
        IServerManagementService serverManagementService,
        ILogger<GetServerEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/servermanagement/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetServerRequest req, CancellationToken ct)
    {
        try
        {
            var server = await _serverManagementService.GetServerAsync(req.Id);
            if (server == null)
            {
                await Send.NotFoundAsync(ct);
            return;
            }

            await Send.OkAsync(server, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting server {ServerId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
