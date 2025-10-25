using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class SyncAllNetworkInterfacesRequest
{
    public int Id { get; set; }
}

public class SyncAllNetworkInterfacesEndpoint : Endpoint<SyncAllNetworkInterfacesRequest, NetworkInterfacesSyncResult>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<SyncAllNetworkInterfacesEndpoint> _logger;

    public SyncAllNetworkInterfacesEndpoint(
        IServerManagementService serverManagementService,
        ILogger<SyncAllNetworkInterfacesEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/servermanagement/{id}/sync-all-network-interfaces");
        AllowAnonymous();
    }

    public override async Task HandleAsync(SyncAllNetworkInterfacesRequest req, CancellationToken ct)
    {
        try
        {
            _logger.LogInformation("🔄 Syncing all network interfaces for server {ServerId}", req.Id);

            var result = await _serverManagementService.SyncAllNetworkInterfacesAsync(req.Id);

            if (result.Success)
            {
                _logger.LogInformation(
                    "✅ Successfully synced server {ServerId}: {Total} devices ({Docker} Docker, {VMs} VMs, {Interfaces} interfaces)",
                    req.Id, result.TotalDevicesSynced, result.DockerContainersSynced,
                    result.VirtualMachinesSynced, result.NetworkInterfacesSynced);

                await Send.OkAsync(result, ct);
            }
            else
            {
                _logger.LogWarning("⚠️ Sync failed for server {ServerId}: {Error}", req.Id, result.ErrorMessage);
                HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsJsonAsync(result, ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to sync network interfaces for server {ServerId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsJsonAsync(new NetworkInterfacesSyncResult
            {
                Success = false,
                ServerId = req.Id,
                ErrorMessage = ex.Message
            }, ct);
        }
    }
}
