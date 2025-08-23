// ServicesDashboard/Services/LogCollection/IRemoteLogCollector.cs
namespace ServicesDashboard.Services.LogCollection;

public interface IRemoteLogCollector
{
    Task<IEnumerable<RemoteContainer>> ListContainersAsync(string serverId);
    Task<string> GetContainerLogsAsync(string serverId, string containerId, int lines = 100);
    Task<string> DownloadContainerLogsAsync(string serverId, string containerId);
    Task<ContainerStats> GetContainerStatsAsync(string serverId, string containerId);
    Task<bool> RestartContainerAsync(string serverId, string containerId);
    Task<bool> StopContainerAsync(string serverId, string containerId);
    Task<bool> StartContainerAsync(string serverId, string containerId);
}

public class RemoteContainer
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Image { get; set; } = string.Empty;
    public string ServerId { get; set; } = string.Empty;
}

public class ContainerStats
{
    public string ContainerId { get; set; } = string.Empty;
    public float CpuPercentage { get; set; }
    public string MemoryUsage { get; set; } = string.Empty;
    public float MemoryPercentage { get; set; }
    public string NetworkIO { get; set; } = string.Empty;
    public string BlockIO { get; set; } = string.Empty;
    public DateTimeOffset Timestamp { get; set; }
}