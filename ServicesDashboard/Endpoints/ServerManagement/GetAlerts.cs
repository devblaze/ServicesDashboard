using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class GetAlertsRequest
{
    public int? ServerId { get; set; }
}

public class GetAlertsEndpoint : Endpoint<GetAlertsRequest, IEnumerable<ServerAlert>>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<GetAlertsEndpoint> _logger;

    public GetAlertsEndpoint(
        IServerManagementService serverManagementService,
        ILogger<GetAlertsEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/servermanagement/alerts");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetAlertsRequest req, CancellationToken ct)
    {
        try
        {
            var alerts = await _serverManagementService.GetActiveAlertsAsync(req.ServerId);
            await Send.OkAsync(alerts, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting alerts");
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
