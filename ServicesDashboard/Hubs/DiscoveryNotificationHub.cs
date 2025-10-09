using Microsoft.AspNetCore.SignalR;
using ServicesDashboard.Models.Results;

namespace ServicesDashboard.Hubs;

public interface IDiscoveryNotificationClient
{
    Task ReceiveScanStarted(Guid scanId, string target, string scanType);
    Task ReceiveScanProgress(Guid scanId, int progress, string message);
    Task ReceiveScanCompleted(Guid scanId, int totalHosts, int totalServices);
    Task ReceiveScanError(Guid scanId, string error);
    Task ReceiveHostDiscovered(Guid scanId, string host, int openPorts);
    Task ReceiveServiceDiscovered(Guid scanId, string host, int port, string serviceName);
}

public class DiscoveryNotificationHub : Hub<IDiscoveryNotificationClient>
{
    private readonly ILogger<DiscoveryNotificationHub> _logger;

    public DiscoveryNotificationHub(ILogger<DiscoveryNotificationHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    public async Task SubscribeToScan(Guid scanId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"scan-{scanId}");
        _logger.LogInformation("Client {ConnectionId} subscribed to scan {ScanId}", Context.ConnectionId, scanId);
    }

    public async Task UnsubscribeFromScan(Guid scanId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"scan-{scanId}");
        _logger.LogInformation("Client {ConnectionId} unsubscribed from scan {ScanId}", Context.ConnectionId, scanId);
    }
}