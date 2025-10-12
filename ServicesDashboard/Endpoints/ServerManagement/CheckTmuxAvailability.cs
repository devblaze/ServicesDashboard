using FastEndpoints;
using ServicesDashboard.Models.Results;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class CheckTmuxAvailabilityRequest
{
    public int Id { get; set; }
}

public class CheckTmuxAvailabilityEndpoint : Endpoint<CheckTmuxAvailabilityRequest, TmuxAvailabilityResult>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<CheckTmuxAvailabilityEndpoint> _logger;

    public CheckTmuxAvailabilityEndpoint(
        IServerManagementService serverManagementService,
        ILogger<CheckTmuxAvailabilityEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/servermanagement/{id}/check-tmux");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CheckTmuxAvailabilityRequest req, CancellationToken ct)
    {
        try
        {
            var server = await _serverManagementService.GetServerAsync(req.Id);
            if (server == null)
            {
                await Send.NotFoundAsync(ct);
            return;
            }

            var result = await _serverManagementService.CheckTmuxAvailabilityAsync(req.Id);
            await Send.OkAsync(result, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking tmux availability for server {ServerId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
