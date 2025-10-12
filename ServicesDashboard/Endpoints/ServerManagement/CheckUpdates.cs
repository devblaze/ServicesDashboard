using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Results;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class CheckUpdatesRequest
{
    public int Id { get; set; }
}

public class CheckUpdatesEndpoint : Endpoint<CheckUpdatesRequest, UpdateReport>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<CheckUpdatesEndpoint> _logger;

    public CheckUpdatesEndpoint(
        IServerManagementService serverManagementService,
        ILogger<CheckUpdatesEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/servermanagement/{id}/check-updates");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CheckUpdatesRequest req, CancellationToken ct)
    {
        try
        {
            var updateReport = await _serverManagementService.CheckForUpdatesAsync(req.Id);
            if (updateReport == null)
            {
                await Send.NotFoundAsync(ct);
            return;
            }

            await Send.OkAsync(updateReport, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking updates for server {ServerId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
