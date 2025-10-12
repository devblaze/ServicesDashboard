using FastEndpoints;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class InstallTmuxRequest
{
    public int Id { get; set; }
}

public class InstallTmuxEndpoint : Endpoint<InstallTmuxRequest>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<InstallTmuxEndpoint> _logger;

    public InstallTmuxEndpoint(
        IServerManagementService serverManagementService,
        ILogger<InstallTmuxEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/servermanagement/{id}/install-tmux");
        AllowAnonymous();
    }

    public override async Task HandleAsync(InstallTmuxRequest req, CancellationToken ct)
    {
        try
        {
            var server = await _serverManagementService.GetServerAsync(req.Id);
            if (server == null)
            {
                await Send.NotFoundAsync(ct);
            return;
            }

            var success = await _serverManagementService.InstallTmuxAsync(req.Id);
            if (success)
            {
                await Send.OkAsync(new { message = "tmux installed successfully" }, ct);
            }
            else
            {
                HttpContext.Response.StatusCode = 500;
                await HttpContext.Response.WriteAsync(@"{""error"":""Failed to install tmux""}", ct);
                return;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error installing tmux on server {ServerId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
