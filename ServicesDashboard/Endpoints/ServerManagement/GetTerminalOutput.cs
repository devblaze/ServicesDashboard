using FastEndpoints;
using ServicesDashboard.Models.Results;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class GetTerminalOutputRequest
{
    public int Id { get; set; }
}

public class GetTerminalOutputEndpoint : Endpoint<GetTerminalOutputRequest, TerminalOutputResult>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<GetTerminalOutputEndpoint> _logger;

    public GetTerminalOutputEndpoint(
        IServerManagementService serverManagementService,
        ILogger<GetTerminalOutputEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/servermanagement/{id}/terminal-output");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetTerminalOutputRequest req, CancellationToken ct)
    {
        try
        {
            var server = await _serverManagementService.GetServerAsync(req.Id);
            if (server == null)
            {
                await Send.NotFoundAsync(ct);
                return;
            }

            var result = await _serverManagementService.GetTerminalOutputAsync(req.Id);
            await Send.OkAsync(result, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting terminal output for server {ServerId}", req.Id);
            await Send.OkAsync(new TerminalOutputResult
            {
                Output = "",
                SessionExists = false,
                CapturedAt = DateTime.UtcNow
            }, ct);
        }
    }
}
