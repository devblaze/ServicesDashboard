using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;

namespace ServicesDashboard.Endpoints.Metrics;

public class GetServerSystemMetricsRequest
{
    public int ServerId { get; set; }
    public int Minutes { get; set; } = 60;
}

public class SystemMetricsDataPoint
{
    public DateTime Timestamp { get; set; }
    public long NetworkRxBytesPerSec { get; set; }
    public long NetworkTxBytesPerSec { get; set; }
    public long NetworkRxBytes { get; set; }
    public long NetworkTxBytes { get; set; }
    public float? CpuTemperature { get; set; }
    public float? GpuTemperature { get; set; }
}

public class NetworkInterfaceSummary
{
    public string InterfaceName { get; set; } = string.Empty;
    public string InterfaceType { get; set; } = string.Empty;
    public long CurrentRxBytesPerSec { get; set; }
    public long CurrentTxBytesPerSec { get; set; }
    public long AvgRxBytesPerSec { get; set; }
    public long AvgTxBytesPerSec { get; set; }
    public long MaxRxBytesPerSec { get; set; }
    public long MaxTxBytesPerSec { get; set; }
    public List<NetworkInterfaceDataPoint> History { get; set; } = new();
}

public class NetworkInterfaceDataPoint
{
    public DateTime Timestamp { get; set; }
    public long RxBytesPerSec { get; set; }
    public long TxBytesPerSec { get; set; }
}

public class NetworkMetricsSummary
{
    public long CurrentRxBytesPerSec { get; set; }
    public long CurrentTxBytesPerSec { get; set; }
    public long AvgRxBytesPerSec { get; set; }
    public long AvgTxBytesPerSec { get; set; }
    public long MaxRxBytesPerSec { get; set; }
    public long MaxTxBytesPerSec { get; set; }
    public long TotalRxBytes { get; set; }
    public long TotalTxBytes { get; set; }
    public List<SystemMetricsDataPoint> History { get; set; } = new();
}

public class TemperatureMetricsSummary
{
    public float? CurrentCpuTemperature { get; set; }
    public float? CurrentGpuTemperature { get; set; }
    public float? AvgCpuTemperature { get; set; }
    public float? MaxCpuTemperature { get; set; }
    public float? AvgGpuTemperature { get; set; }
    public float? MaxGpuTemperature { get; set; }
    public List<TemperatureDataPoint> History { get; set; } = new();
}

public class TemperatureDataPoint
{
    public DateTime Timestamp { get; set; }
    public float? CpuTemperature { get; set; }
    public float? GpuTemperature { get; set; }
}

public class ServerSystemMetricsResponse
{
    public int ServerId { get; set; }
    public string ServerName { get; set; } = string.Empty;
    public string ServerType { get; set; } = "linux";
    public DateTime LastUpdated { get; set; }
    public NetworkMetricsSummary Network { get; set; } = new();
    public TemperatureMetricsSummary Temperatures { get; set; } = new();
    public List<NetworkInterfaceSummary> Interfaces { get; set; } = new();
}

public class GetServerSystemMetricsEndpoint : Endpoint<GetServerSystemMetricsRequest, ServerSystemMetricsResponse>
{
    private readonly ServicesDashboardContext _context;

    public GetServerSystemMetricsEndpoint(ServicesDashboardContext context)
    {
        _context = context;
    }

    public override void Configure()
    {
        Get("/api/metrics/servers/{serverId}/system");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetServerSystemMetricsRequest req, CancellationToken ct)
    {
        var server = await _context.ManagedServers
            .FirstOrDefaultAsync(s => s.Id == req.ServerId, ct);

        if (server == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        var cutoff = DateTime.UtcNow.AddMinutes(-req.Minutes);

        // Get system metrics history
        var systemMetrics = await _context.SystemMetricsHistory
            .Where(m => m.ServerId == req.ServerId && m.Timestamp >= cutoff)
            .OrderBy(m => m.Timestamp)
            .ToListAsync(ct);

        // Get network interface metrics
        var interfaceMetrics = await _context.NetworkInterfaceMetricsHistory
            .Where(m => m.ServerId == req.ServerId && m.Timestamp >= cutoff)
            .OrderBy(m => m.Timestamp)
            .ToListAsync(ct);

        // Detect server type (check for Unraid-specific disk patterns)
        var diskMetrics = await _context.DiskMetricsHistory
            .Where(m => m.ServerId == req.ServerId)
            .OrderByDescending(m => m.Timestamp)
            .Take(10)
            .ToListAsync(ct);

        var serverType = diskMetrics.Any(d => d.DiskType == "array" || d.DiskType == "cache" || d.DiskType == "parity")
            ? "unraid"
            : "linux";

        // Build network summary
        var networkSummary = new NetworkMetricsSummary();
        if (systemMetrics.Any())
        {
            var latest = systemMetrics.Last();
            networkSummary.CurrentRxBytesPerSec = latest.NetworkRxBytesPerSec;
            networkSummary.CurrentTxBytesPerSec = latest.NetworkTxBytesPerSec;
            networkSummary.TotalRxBytes = latest.NetworkRxBytes;
            networkSummary.TotalTxBytes = latest.NetworkTxBytes;
            networkSummary.AvgRxBytesPerSec = (long)systemMetrics.Average(m => m.NetworkRxBytesPerSec);
            networkSummary.AvgTxBytesPerSec = (long)systemMetrics.Average(m => m.NetworkTxBytesPerSec);
            networkSummary.MaxRxBytesPerSec = systemMetrics.Max(m => m.NetworkRxBytesPerSec);
            networkSummary.MaxTxBytesPerSec = systemMetrics.Max(m => m.NetworkTxBytesPerSec);
            networkSummary.History = systemMetrics.Select(m => new SystemMetricsDataPoint
            {
                Timestamp = m.Timestamp,
                NetworkRxBytesPerSec = m.NetworkRxBytesPerSec,
                NetworkTxBytesPerSec = m.NetworkTxBytesPerSec,
                NetworkRxBytes = m.NetworkRxBytes,
                NetworkTxBytes = m.NetworkTxBytes,
                CpuTemperature = m.CpuTemperature,
                GpuTemperature = m.GpuTemperature
            }).ToList();
        }

        // Build temperature summary
        var tempSummary = new TemperatureMetricsSummary();
        var metricsWithCpuTemp = systemMetrics.Where(m => m.CpuTemperature.HasValue).ToList();
        var metricsWithGpuTemp = systemMetrics.Where(m => m.GpuTemperature.HasValue).ToList();

        if (systemMetrics.Any())
        {
            var latest = systemMetrics.Last();
            tempSummary.CurrentCpuTemperature = latest.CpuTemperature;
            tempSummary.CurrentGpuTemperature = latest.GpuTemperature;
        }

        if (metricsWithCpuTemp.Any())
        {
            tempSummary.AvgCpuTemperature = metricsWithCpuTemp.Average(m => m.CpuTemperature);
            tempSummary.MaxCpuTemperature = metricsWithCpuTemp.Max(m => m.CpuTemperature);
        }

        if (metricsWithGpuTemp.Any())
        {
            tempSummary.AvgGpuTemperature = metricsWithGpuTemp.Average(m => m.GpuTemperature);
            tempSummary.MaxGpuTemperature = metricsWithGpuTemp.Max(m => m.GpuTemperature);
        }

        tempSummary.History = systemMetrics.Select(m => new TemperatureDataPoint
        {
            Timestamp = m.Timestamp,
            CpuTemperature = m.CpuTemperature,
            GpuTemperature = m.GpuTemperature
        }).ToList();

        // Build interface summaries
        var interfaceSummaries = interfaceMetrics
            .GroupBy(m => m.InterfaceName)
            .Select(g =>
            {
                var latest = g.Last();
                return new NetworkInterfaceSummary
                {
                    InterfaceName = g.Key,
                    InterfaceType = latest.InterfaceType,
                    CurrentRxBytesPerSec = latest.RxBytesPerSec,
                    CurrentTxBytesPerSec = latest.TxBytesPerSec,
                    AvgRxBytesPerSec = (long)g.Average(m => m.RxBytesPerSec),
                    AvgTxBytesPerSec = (long)g.Average(m => m.TxBytesPerSec),
                    MaxRxBytesPerSec = g.Max(m => m.RxBytesPerSec),
                    MaxTxBytesPerSec = g.Max(m => m.TxBytesPerSec),
                    History = g.Select(m => new NetworkInterfaceDataPoint
                    {
                        Timestamp = m.Timestamp,
                        RxBytesPerSec = m.RxBytesPerSec,
                        TxBytesPerSec = m.TxBytesPerSec
                    }).ToList()
                };
            })
            .OrderBy(i => i.InterfaceType)
            .ThenBy(i => i.InterfaceName)
            .ToList();

        var response = new ServerSystemMetricsResponse
        {
            ServerId = req.ServerId,
            ServerName = server.Name,
            ServerType = serverType,
            LastUpdated = systemMetrics.Any() ? systemMetrics.Max(m => m.Timestamp) : DateTime.UtcNow,
            Network = networkSummary,
            Temperatures = tempSummary,
            Interfaces = interfaceSummaries
        };

        await Send.OkAsync(response, ct);
    }
}
