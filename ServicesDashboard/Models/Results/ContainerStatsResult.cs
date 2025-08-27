namespace ServicesDashboard.Models.Results;

public class ContainerStatsResult
{
    public string ContainerId { get; set; } = string.Empty;
    public float CpuPercentage { get; set; }
    public string MemoryUsage { get; set; } = string.Empty;
    public float MemoryPercentage { get; set; }
    public string NetworkIO { get; set; } = string.Empty;
    public string BlockIO { get; set; } = string.Empty;
    public DateTimeOffset Timestamp { get; set; }
}