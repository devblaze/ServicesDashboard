namespace ServicesDashboard.Models.Results;

public class SystemMetricsResult
{
    public double CpuUsage { get; set; }
    public double MemoryUsage { get; set; }
    public double DiskUsage { get; set; }
    public double LoadAverage { get; set; }
    public int RunningProcesses { get; set; }
    public string? OperatingSystem { get; set; }
}