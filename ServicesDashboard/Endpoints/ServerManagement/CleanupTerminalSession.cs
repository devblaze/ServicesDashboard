using FastEndpoints;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class CleanupTerminalSessionRequest
{
    public int Id { get; set; }
}

public class CleanupTerminalSessionEndpoint : Endpoint<CleanupTerminalSessionRequest>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<CleanupTerminalSessionEndpoint> _logger;

    public CleanupTerminalSessionEndpoint(
        IServerManagementService serverManagementService,
        ILogger<CleanupTerminalSessionEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Delete("/api/servermanagement/{id}/terminal-session");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CleanupTerminalSessionRequest req, CancellationToken ct)
    {
        try
        {
            var server = await _serverManagementService.GetServerAsync(req.Id);
            if (server == null)
            {
                await Send.NotFoundAsync(ct);
            return;
            }

            var success = await _serverManagementService.CleanupTerminalSessionAsync(req.Id);
            if (success)
            {
                await Send.OkAsync(ct);
            }
            else
            {
                HttpContext.Response.StatusCode = 500;
                await HttpContext.Response.WriteAsync(@"{""error"":""Failed to cleanup session""}", ct);
                return;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cleaning up terminal session for server {ServerId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
