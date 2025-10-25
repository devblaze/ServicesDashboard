using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class CheckIpConflictRequest
{
    public string IpAddress { get; set; } = string.Empty;
    public int? ExcludeDeviceId { get; set; }
}

public class CheckIpConflictEndpoint : Endpoint<CheckIpConflictRequest, IpConflictCheckResult>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<CheckIpConflictEndpoint> _logger;

    public CheckIpConflictEndpoint(
        IServerManagementService serverManagementService,
        ILogger<CheckIpConflictEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/servermanagement/check-ip-conflict");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CheckIpConflictRequest req, CancellationToken ct)
    {
        try
        {
            _logger.LogInformation("🔍 Checking IP {IpAddress} for conflicts", req.IpAddress);

            var result = await _serverManagementService.CheckIpConflictAsync(req.IpAddress, req.ExcludeDeviceId);

            await Send.OkAsync(result, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to check IP {IpAddress} for conflicts", req.IpAddress);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsJsonAsync(new IpConflictCheckResult
            {
                IsAvailable = false,
                HasConflict = false
            }, ct);
        }
    }
}
