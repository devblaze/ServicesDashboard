using FastEndpoints;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class DeleteServerRequest
{
    public int Id { get; set; }
}

public class DeleteServerEndpoint : Endpoint<DeleteServerRequest>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<DeleteServerEndpoint> _logger;

    public DeleteServerEndpoint(
        IServerManagementService serverManagementService,
        ILogger<DeleteServerEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Delete("/api/servermanagement/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(DeleteServerRequest req, CancellationToken ct)
    {
        try
        {
            var deleted = await _serverManagementService.DeleteServerAsync(req.Id);
            if (!deleted)
            {
                await Send.NotFoundAsync(ct);
            return;
            }

            await Send.NoContentAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting server {ServerId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
