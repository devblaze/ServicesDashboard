
namespace ServicesDashboard.Services;

public interface INetworkDiscoveryService
{
    Task<IEnumerable<DiscoveredService>> ScanNetworkAsync(string networkRange, int[] ports, CancellationToken cancellationToken = default);
    Task<IEnumerable<DiscoveredService>> ScanHostAsync(string hostAddress, int[] ports, CancellationToken cancellationToken = default);
}

public class DiscoveredService
{
    public string HostAddress { get; set; } = string.Empty;
    public string HostName { get; set; } = string.Empty;
    public int Port { get; set; }
    public bool IsReachable { get; set; }
    public string ServiceType { get; set; } = "Unknown";
    public string? Banner { get; set; }
    public TimeSpan ResponseTime { get; set; }
    public DateTime DiscoveredAt { get; set; } = DateTime.UtcNow;
}
