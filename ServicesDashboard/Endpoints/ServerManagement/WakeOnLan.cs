using FastEndpoints;
using ServicesDashboard.Models.Results;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class WakeOnLanRequest
{
    public int Id { get; set; }
}

public class WakeOnLanEndpoint : Endpoint<WakeOnLanRequest, WakeOnLanResult>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<WakeOnLanEndpoint> _logger;

    public WakeOnLanEndpoint(
        IServerManagementService serverManagementService,
        ILogger<WakeOnLanEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/servermanagement/{id}/wake-on-lan");
        AllowAnonymous();
    }

    public override async Task HandleAsync(WakeOnLanRequest req, CancellationToken ct)
    {
        try
        {
            var result = await _serverManagementService.SendWakeOnLanAsync(req.Id);

            if (!result.Success)
            {
                HttpContext.Response.StatusCode = 400;
                await Send.OkAsync(result, ct);
                return;
            }

            await Send.OkAsync(result, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending Wake-on-LAN packet for server {ServerId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
