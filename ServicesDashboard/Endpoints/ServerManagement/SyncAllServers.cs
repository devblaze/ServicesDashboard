using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class SyncAllServersEndpoint : EndpointWithoutRequest<BulkSyncResult>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<SyncAllServersEndpoint> _logger;

    public SyncAllServersEndpoint(
        IServerManagementService serverManagementService,
        ILogger<SyncAllServersEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/servermanagement/sync-all-servers");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        try
        {
            _logger.LogInformation("🚀 Starting bulk sync for all servers");

            var result = await _serverManagementService.SyncAllServersAsync();

            if (result.Success)
            {
                _logger.LogInformation(
                    "✅ Bulk sync completed successfully: {Success}/{Total} servers, {Devices} devices synced",
                    result.SuccessfulServers, result.TotalServers, result.TotalDevicesSynced);

                await Send.OkAsync(result, ct);
            }
            else
            {
                _logger.LogWarning(
                    "⚠️ Bulk sync completed with errors: {Success}/{Total} servers succeeded",
                    result.SuccessfulServers, result.TotalServers);

                HttpContext.Response.StatusCode = result.SuccessfulServers > 0 ? 200 : 400;
                await HttpContext.Response.WriteAsJsonAsync(result, ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Bulk sync failed");
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsJsonAsync(new BulkSyncResult
            {
                Success = false,
                ErrorMessage = ex.Message
            }, ct);
        }
    }
}
