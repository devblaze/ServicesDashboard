using FastEndpoints;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class GetServerLogsRequest
{
    public int Id { get; set; }
    public int? Lines { get; set; } = 100;
}

public class GetServerLogsEndpoint : Endpoint<GetServerLogsRequest>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<GetServerLogsEndpoint> _logger;

    public GetServerLogsEndpoint(
        IServerManagementService serverManagementService,
        ILogger<GetServerLogsEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/servermanagement/{id}/logs");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetServerLogsRequest req, CancellationToken ct)
    {
        try
        {
            var server = await _serverManagementService.GetServerAsync(req.Id);
            if (server == null)
            {
                await Send.NotFoundAsync(ct);
            return;
            }

            var logs = await _serverManagementService.GetServerLogsAsync(server, req.Lines);
            await Send.OkAsync(new { logs }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting logs for server {ServerId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
