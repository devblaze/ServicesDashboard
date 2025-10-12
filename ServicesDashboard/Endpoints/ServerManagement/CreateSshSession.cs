using FastEndpoints;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class CreateSshSessionRequest
{
    public int Id { get; set; }
}

public class CreateSshSessionEndpoint : Endpoint<CreateSshSessionRequest>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<CreateSshSessionEndpoint> _logger;

    public CreateSshSessionEndpoint(
        IServerManagementService serverManagementService,
        ILogger<CreateSshSessionEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/servermanagement/{id}/ssh-session");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CreateSshSessionRequest req, CancellationToken ct)
    {
        try
        {
            var server = await _serverManagementService.GetServerAsync(req.Id);
            if (server == null)
            {
                await Send.NotFoundAsync(ct);
            return;
            }

            // Return SSH connection details for web terminal
            await Send.OkAsync(new
            {
                serverId = req.Id,
                host = server.HostAddress,
                port = server.SshPort ?? 22,
                username = server.Username
            }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating SSH session for server {ServerId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
