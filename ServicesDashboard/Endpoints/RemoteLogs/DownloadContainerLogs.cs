using FastEndpoints;
using ServicesDashboard.Services.LogCollection;

namespace ServicesDashboard.Endpoints.RemoteLogs;

public class DownloadContainerLogsRequest
{
    public string ServerId { get; set; } = string.Empty;
    public string ContainerId { get; set; } = string.Empty;
}

public class DownloadContainerLogsEndpoint : Endpoint<DownloadContainerLogsRequest>
{
    private readonly IRemoteLogCollector _logCollector;
    private readonly ILogger<DownloadContainerLogsEndpoint> _logger;

    public DownloadContainerLogsEndpoint(
        IRemoteLogCollector logCollector,
        ILogger<DownloadContainerLogsEndpoint> logger)
    {
        _logCollector = logCollector;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/remotelogs/servers/{serverId}/containers/{containerId}/download");
        AllowAnonymous();
    }

    public override async Task HandleAsync(DownloadContainerLogsRequest req, CancellationToken ct)
    {
        try
        {
            var logs = await _logCollector.DownloadContainerLogsAsync(req.ServerId, req.ContainerId);
            var bytes = System.Text.Encoding.UTF8.GetBytes(logs);
            await Send.BytesAsync(bytes, $"{req.ContainerId}-logs.txt", "text/plain", cancellation: ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error downloading logs for container {ContainerId} on server {ServerId}", req.ContainerId, req.ServerId);
            await Send.ResponseAsync(new { error = "Failed to download container logs: " + ex.Message }, 500, ct);
        }
    }
}
