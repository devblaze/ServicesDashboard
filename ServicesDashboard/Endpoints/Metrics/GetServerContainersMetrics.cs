using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;

namespace ServicesDashboard.Endpoints.Metrics;

public class GetServerContainersMetricsRequest
{
    public int ServerId { get; set; }
    public int Minutes { get; set; } = 60; // Default to 1 hour
}

public class ContainerMetricsSummary
{
    public string ContainerId { get; set; } = string.Empty;
    public string ContainerName { get; set; } = string.Empty;

    // Current values (most recent)
    public float CurrentCpuPercentage { get; set; }
    public long CurrentMemoryUsageBytes { get; set; }
    public float CurrentMemoryPercentage { get; set; }
    public long MemoryLimitBytes { get; set; }
    public long CurrentNetworkRxBytes { get; set; }
    public long CurrentNetworkTxBytes { get; set; }

    // Averages over the period
    public float AvgCpuPercentage { get; set; }
    public float AvgMemoryPercentage { get; set; }

    // Peak values
    public float MaxCpuPercentage { get; set; }
    public float MaxMemoryPercentage { get; set; }

    // Historical data for charts
    public List<ContainerMetricDataPoint> History { get; set; } = new();
}

public class ServerContainersMetricsResponse
{
    public int ServerId { get; set; }
    public string ServerName { get; set; } = string.Empty;
    public DateTime LastUpdated { get; set; }
    public List<ContainerMetricsSummary> Containers { get; set; } = new();
}

public class GetServerContainersMetricsEndpoint : Endpoint<GetServerContainersMetricsRequest, ServerContainersMetricsResponse>
{
    private readonly ServicesDashboardContext _context;

    public GetServerContainersMetricsEndpoint(ServicesDashboardContext context)
    {
        _context = context;
    }

    public override void Configure()
    {
        Get("/api/metrics/servers/{serverId}/containers");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetServerContainersMetricsRequest req, CancellationToken ct)
    {
        var server = await _context.ManagedServers
            .FirstOrDefaultAsync(s => s.Id == req.ServerId, ct);

        if (server == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        var cutoff = DateTime.UtcNow.AddMinutes(-req.Minutes);

        var metrics = await _context.ContainerMetricsHistory
            .Where(m => m.ServerId == req.ServerId && m.Timestamp >= cutoff)
            .OrderBy(m => m.Timestamp)
            .ToListAsync(ct);

        var containerGroups = metrics
            .GroupBy(m => m.ContainerId)
            .Select(g => new ContainerMetricsSummary
            {
                ContainerId = g.Key,
                ContainerName = g.Last().ContainerName,
                CurrentCpuPercentage = g.Last().CpuPercentage,
                CurrentMemoryUsageBytes = g.Last().MemoryUsageBytes,
                CurrentMemoryPercentage = g.Last().MemoryPercentage,
                MemoryLimitBytes = g.Last().MemoryLimitBytes,
                CurrentNetworkRxBytes = g.Last().NetworkRxBytes,
                CurrentNetworkTxBytes = g.Last().NetworkTxBytes,
                AvgCpuPercentage = g.Average(m => m.CpuPercentage),
                AvgMemoryPercentage = g.Average(m => m.MemoryPercentage),
                MaxCpuPercentage = g.Max(m => m.CpuPercentage),
                MaxMemoryPercentage = g.Max(m => m.MemoryPercentage),
                History = g.Select(m => new ContainerMetricDataPoint
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
            })
            .OrderBy(c => c.ContainerName)
            .ToList();

        var response = new ServerContainersMetricsResponse
        {
            ServerId = req.ServerId,
            ServerName = server.Name,
            LastUpdated = metrics.Any() ? metrics.Max(m => m.Timestamp) : DateTime.UtcNow,
            Containers = containerGroups
        };

        await Send.OkAsync(response, ct);
    }
}
