using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;
using ServicesDashboard.Models;

namespace ServicesDashboard.Endpoints.Metrics;

public class GetAllServersMetricsRequest
{
    public int Minutes { get; set; } = 60; // Default to 1 hour
}

public class ServerMetricsSummary
{
    public int ServerId { get; set; }
    public string ServerName { get; set; } = string.Empty;
    public string HostAddress { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int ContainerCount { get; set; }

    // Aggregated current values
    public float TotalCpuPercentage { get; set; }
    public long TotalMemoryUsageBytes { get; set; }
    public long TotalMemoryLimitBytes { get; set; }
    public long TotalNetworkRxBytes { get; set; }
    public long TotalNetworkTxBytes { get; set; }

    // Last update time
    public DateTime? LastMetricsUpdate { get; set; }
}

public class AllServersMetricsResponse
{
    public List<ServerMetricsSummary> Servers { get; set; } = new();
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class GetAllServersMetricsEndpoint : Endpoint<GetAllServersMetricsRequest, AllServersMetricsResponse>
{
    private readonly ServicesDashboardContext _context;

    public GetAllServersMetricsEndpoint(ServicesDashboardContext context)
    {
        _context = context;
    }

    public override void Configure()
    {
        Get("/api/metrics/servers");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetAllServersMetricsRequest req, CancellationToken ct)
    {
        var servers = await _context.ManagedServers.ToListAsync(ct);

        var cutoff = DateTime.UtcNow.AddMinutes(-req.Minutes);

        // Get the most recent metrics for each container on each server
        var latestMetrics = await _context.ContainerMetricsHistory
            .Where(m => m.Timestamp >= cutoff)
            .GroupBy(m => new { m.ServerId, m.ContainerId })
            .Select(g => g.OrderByDescending(m => m.Timestamp).First())
            .ToListAsync(ct);

        var serverSummaries = servers.Select(server =>
        {
            var serverMetrics = latestMetrics.Where(m => m.ServerId == server.Id).ToList();

            return new ServerMetricsSummary
            {
                ServerId = server.Id,
                ServerName = server.Name,
                HostAddress = server.HostAddress,
                Status = server.Status.ToString(),
                ContainerCount = serverMetrics.Count,
                TotalCpuPercentage = serverMetrics.Sum(m => m.CpuPercentage),
                TotalMemoryUsageBytes = serverMetrics.Sum(m => m.MemoryUsageBytes),
                TotalMemoryLimitBytes = serverMetrics.Sum(m => m.MemoryLimitBytes),
                TotalNetworkRxBytes = serverMetrics.Sum(m => m.NetworkRxBytes),
                TotalNetworkTxBytes = serverMetrics.Sum(m => m.NetworkTxBytes),
                LastMetricsUpdate = serverMetrics.Any() ? serverMetrics.Max(m => m.Timestamp) : null
            };
        }).OrderBy(s => s.ServerName).ToList();

        var response = new AllServersMetricsResponse
        {
            Servers = serverSummaries,
            Timestamp = DateTime.UtcNow
        };

        await Send.OkAsync(response, ct);
    }
}
