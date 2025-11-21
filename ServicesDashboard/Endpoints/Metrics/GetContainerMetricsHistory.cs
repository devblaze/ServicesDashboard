using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;

namespace ServicesDashboard.Endpoints.Metrics;

public class GetContainerMetricsHistoryRequest
{
    public int ServerId { get; set; }
    public string ContainerId { get; set; } = string.Empty;
    public int Minutes { get; set; } = 60; // Default to 1 hour
}

public class ContainerMetricDataPoint
{
    public DateTime Timestamp { get; set; }
    public float CpuPercentage { get; set; }
    public long MemoryUsageBytes { get; set; }
    public float MemoryPercentage { get; set; }
    public long MemoryLimitBytes { get; set; }
    public long NetworkRxBytes { get; set; }
    public long NetworkTxBytes { get; set; }
    public long BlockReadBytes { get; set; }
    public long BlockWriteBytes { get; set; }
}

public class ContainerMetricsHistoryResponse
{
    public string ContainerId { get; set; } = string.Empty;
    public string ContainerName { get; set; } = string.Empty;
    public int ServerId { get; set; }
    public List<ContainerMetricDataPoint> DataPoints { get; set; } = new();
}

public class GetContainerMetricsHistoryEndpoint : Endpoint<GetContainerMetricsHistoryRequest, ContainerMetricsHistoryResponse>
{
    private readonly ServicesDashboardContext _context;

    public GetContainerMetricsHistoryEndpoint(ServicesDashboardContext context)
    {
        _context = context;
    }

    public override void Configure()
    {
        Get("/api/metrics/servers/{serverId}/containers/{containerId}/history");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetContainerMetricsHistoryRequest req, CancellationToken ct)
    {
        var cutoff = DateTime.UtcNow.AddMinutes(-req.Minutes);

        var metrics = await _context.ContainerMetricsHistory
            .Where(m => m.ServerId == req.ServerId &&
                       m.ContainerId == req.ContainerId &&
                       m.Timestamp >= cutoff)
            .OrderBy(m => m.Timestamp)
            .ToListAsync(ct);

        var response = new ContainerMetricsHistoryResponse
        {
            ContainerId = req.ContainerId,
            ServerId = req.ServerId,
            ContainerName = metrics.FirstOrDefault()?.ContainerName ?? req.ContainerId,
            DataPoints = metrics.Select(m => new ContainerMetricDataPoint
            {
                Timestamp = m.Timestamp,
                CpuPercentage = m.CpuPercentage,
                MemoryUsageBytes = m.MemoryUsageBytes,
                MemoryPercentage = m.MemoryPercentage,
                MemoryLimitBytes = m.MemoryLimitBytes,
                NetworkRxBytes = m.NetworkRxBytes,
                NetworkTxBytes = m.NetworkTxBytes,
                BlockReadBytes = m.BlockReadBytes,
                BlockWriteBytes = m.BlockWriteBytes
            }).ToList()
        };

        await Send.OkAsync(response, ct);
    }
}
