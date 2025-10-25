using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class SuggestIpsForMigrationEndpoint : Endpoint<IpSuggestionRequest, IpSuggestionResult>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<SuggestIpsForMigrationEndpoint> _logger;

    public SuggestIpsForMigrationEndpoint(
        IServerManagementService serverManagementService,
        ILogger<SuggestIpsForMigrationEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/servermanagement/suggest-ips-for-migration");
        AllowAnonymous();
    }

    public override async Task HandleAsync(IpSuggestionRequest req, CancellationToken ct)
    {
        try
        {
            _logger.LogInformation("🔍 Suggesting IPs for {Count} containers on server {ServerId}",
                req.ContainerIds.Count, req.ServerId);

            var result = await _serverManagementService.SuggestIpsForMigrationAsync(req);

            if (result.Success)
            {
                await Send.OkAsync(result, ct);
            }
            else
            {
                HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsJsonAsync(result, ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to suggest IPs for migration");
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsJsonAsync(new IpSuggestionResult
            {
                Success = false,
                ErrorMessage = ex.Message
            }, ct);
        }
    }
}
