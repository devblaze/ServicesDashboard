using FastEndpoints;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class CheckHostAvailabilityRequest
{
    public string HostAddress { get; set; } = string.Empty;
}

public class CheckHostAvailabilityEndpoint : Endpoint<CheckHostAvailabilityRequest>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<CheckHostAvailabilityEndpoint> _logger;

    public CheckHostAvailabilityEndpoint(
        IServerManagementService serverManagementService,
        ILogger<CheckHostAvailabilityEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/servermanagement/check-host-availability");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CheckHostAvailabilityRequest req, CancellationToken ct)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(req.HostAddress))
            {
                HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsync(@"{""error"":""Host address is required""}", ct);
                return;
            }

            var isAvailable = await _serverManagementService.IsHostAddressAvailableAsync(req.HostAddress);
            await Send.OkAsync(new { available = isAvailable }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking host availability for {HostAddress}", req.HostAddress);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
