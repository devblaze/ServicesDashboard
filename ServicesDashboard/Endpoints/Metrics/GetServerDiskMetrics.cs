using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;

namespace ServicesDashboard.Endpoints.Metrics;

public class GetServerDiskMetricsRequest
{
    public int ServerId { get; set; }
    public int Minutes { get; set; } = 60;
}

public class DiskMetricsSummary
{
    // Array totals (for Unraid)
    public long ArrayTotalBytes { get; set; }
    public long ArrayUsedBytes { get; set; }
    public long ArrayFreeBytes { get; set; }
    public float ArrayUsagePercentage { get; set; }

    // Cache totals (for Unraid)
    public long? CacheTotalBytes { get; set; }
    public long? CacheUsedBytes { get; set; }
    public long? CacheFreeBytes { get; set; }
    public float? CacheUsagePercentage { get; set; }

    // Parity info (for Unraid)
    public long? ParityTotalBytes { get; set; }

    // System totals (for generic Linux)
    public long SystemTotalBytes { get; set; }
    public long SystemUsedBytes { get; set; }
    public long SystemFreeBytes { get; set; }
    public float SystemUsagePercentage { get; set; }
}

public class DiskInfo
{
    public string DiskName { get; set; } = string.Empty;
    public string DiskType { get; set; } = string.Empty;
    public string? Device { get; set; }
    public string? MountPoint { get; set; }
    public long TotalBytes { get; set; }
    public long UsedBytes { get; set; }
    public long FreeBytes { get; set; }
    public float UsagePercentage { get; set; }
    public float? Temperature { get; set; }
    public string? Status { get; set; }
    public List<DiskHistoryDataPoint> History { get; set; } = new();
}

public class DiskHistoryDataPoint
{
    public DateTime Timestamp { get; set; }
    public long UsedBytes { get; set; }
    public float UsagePercentage { get; set; }
    public float? Temperature { get; set; }
}

public class ServerDiskMetricsResponse
{
    public int ServerId { get; set; }
    public string ServerName { get; set; } = string.Empty;
    public string ServerType { get; set; } = "linux";
    public DateTime LastUpdated { get; set; }
    public DiskMetricsSummary Summary { get; set; } = new();
    public List<DiskInfo> Disks { get; set; } = new();
}

public class GetServerDiskMetricsEndpoint : Endpoint<GetServerDiskMetricsRequest, ServerDiskMetricsResponse>
{
    private readonly ServicesDashboardContext _context;

    public GetServerDiskMetricsEndpoint(ServicesDashboardContext context)
    {
        _context = context;
    }

    public override void Configure()
    {
        Get("/api/metrics/servers/{serverId}/disks");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetServerDiskMetricsRequest req, CancellationToken ct)
    {
        var server = await _context.ManagedServers
            .FirstOrDefaultAsync(s => s.Id == req.ServerId, ct);

        if (server == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        var cutoff = DateTime.UtcNow.AddMinutes(-req.Minutes);

        // Get disk metrics history
        var diskMetrics = await _context.DiskMetricsHistory
            .Where(m => m.ServerId == req.ServerId && m.Timestamp >= cutoff)
            .OrderBy(m => m.Timestamp)
            .ToListAsync(ct);

        // Detect server type
        var isUnraid = diskMetrics.Any(d => d.DiskType is "array" or "cache" or "parity");
        var serverType = isUnraid ? "unraid" : "linux";

        // Build summary
        var summary = new DiskMetricsSummary();

        if (diskMetrics.Any())
        {
            // Get the latest reading for each disk
            var latestByDisk = diskMetrics
                .GroupBy(m => m.DiskName)
                .Select(g => g.Last())
                .ToList();

            if (isUnraid)
            {
                // Array disks
                var arrayDisks = latestByDisk.Where(d => d.DiskType == "array").ToList();
                if (arrayDisks.Any())
                {
                    summary.ArrayTotalBytes = arrayDisks.Sum(d => d.TotalBytes);
                    summary.ArrayUsedBytes = arrayDisks.Sum(d => d.UsedBytes);
                    summary.ArrayFreeBytes = arrayDisks.Sum(d => d.FreeBytes);
                    summary.ArrayUsagePercentage = summary.ArrayTotalBytes > 0
                        ? (float)summary.ArrayUsedBytes / summary.ArrayTotalBytes * 100
                        : 0;
                }

                // Cache
                var cacheDisks = latestByDisk.Where(d => d.DiskType == "cache").ToList();
                if (cacheDisks.Any())
                {
                    summary.CacheTotalBytes = cacheDisks.Sum(d => d.TotalBytes);
                    summary.CacheUsedBytes = cacheDisks.Sum(d => d.UsedBytes);
                    summary.CacheFreeBytes = cacheDisks.Sum(d => d.FreeBytes);
                    summary.CacheUsagePercentage = summary.CacheTotalBytes > 0
                        ? (float)summary.CacheUsedBytes / summary.CacheTotalBytes * 100
                        : 0;
                }

                // Parity
                var parityDisks = latestByDisk.Where(d => d.DiskType == "parity").ToList();
                if (parityDisks.Any())
                {
                    summary.ParityTotalBytes = parityDisks.Sum(d => d.TotalBytes);
                }
            }
            else
            {
                // Generic Linux - sum all disks
                summary.SystemTotalBytes = latestByDisk.Sum(d => d.TotalBytes);
                summary.SystemUsedBytes = latestByDisk.Sum(d => d.UsedBytes);
                summary.SystemFreeBytes = latestByDisk.Sum(d => d.FreeBytes);
                summary.SystemUsagePercentage = summary.SystemTotalBytes > 0
                    ? (float)summary.SystemUsedBytes / summary.SystemTotalBytes * 100
                    : 0;
            }
        }

        // Build disk details with history
        var disks = diskMetrics
            .GroupBy(m => m.DiskName)
            .Select(g =>
            {
                var latest = g.Last();
                return new DiskInfo
                {
                    DiskName = g.Key,
                    DiskType = latest.DiskType,
                    Device = latest.Device,
                    MountPoint = latest.MountPoint,
                    TotalBytes = latest.TotalBytes,
                    UsedBytes = latest.UsedBytes,
                    FreeBytes = latest.FreeBytes,
                    UsagePercentage = latest.UsagePercentage,
                    Temperature = latest.Temperature,
                    Status = latest.Status,
                    History = g.Select(m => new DiskHistoryDataPoint
                    {
                        Timestamp = m.Timestamp,
                        UsedBytes = m.UsedBytes,
                        UsagePercentage = m.UsagePercentage,
                        Temperature = m.Temperature
                    }).ToList()
                };
            })
            .OrderBy(d => d.DiskType switch
            {
                "parity" => 0,
                "array" => 1,
                "cache" => 2,
                "system" => 3,
                _ => 4
            })
            .ThenBy(d => d.DiskName)
            .ToList();

        var response = new ServerDiskMetricsResponse
        {
            ServerId = req.ServerId,
            ServerName = server.Name,
            ServerType = serverType,
            LastUpdated = diskMetrics.Any() ? diskMetrics.Max(m => m.Timestamp) : DateTime.UtcNow,
            Summary = summary,
            Disks = disks
        };

        await Send.OkAsync(response, ct);
    }
}
