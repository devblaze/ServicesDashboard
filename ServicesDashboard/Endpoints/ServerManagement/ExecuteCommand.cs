using FastEndpoints;
using ServicesDashboard.Models.Requests;
using ServicesDashboard.Models.Results;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class ExecuteCommandRequest
{
    public int Id { get; set; }
    public string Command { get; set; } = string.Empty;
}

public class ExecuteCommandEndpoint : Endpoint<ExecuteCommandRequest, CommandResult>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<ExecuteCommandEndpoint> _logger;

    public ExecuteCommandEndpoint(
        IServerManagementService serverManagementService,
        ILogger<ExecuteCommandEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/servermanagement/{id}/execute-command");
        AllowAnonymous();
    }

    public override async Task HandleAsync(ExecuteCommandRequest req, CancellationToken ct)
    {
        try
        {
            var server = await _serverManagementService.GetServerAsync(req.Id);
            if (server == null)
            {
                await Send.NotFoundAsync(ct);
            return;
            }

            var result = await _serverManagementService.ExecuteCommandAsync(req.Id, req.Command);
            await Send.OkAsync(result, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing command on server {ServerId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
