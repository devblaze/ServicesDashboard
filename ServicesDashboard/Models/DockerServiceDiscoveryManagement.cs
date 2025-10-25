namespace ServicesDashboard.Models;

public class DockerService
{
    public string ContainerId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Image { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public List<DockerPort> Ports { get; set; } = new();
    public Dictionary<string, string> Labels { get; set; } = new();
    public Dictionary<string, string> Environment { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public string? Description { get; set; }
    public string? ServiceUrl { get; set; }
    public bool IsWebService { get; set; }

    // Network configuration
    public List<DockerNetworkConfig> Networks { get; set; } = new();
    public string? NetworkMode { get; set; }
    public string? MacAddress { get; set; }
}

public class DockerPort
{
    public int ContainerPort { get; set; }
    public int? HostPort { get; set; }
    public string Protocol { get; set; } = "tcp";
    public string? HostIp { get; set; }
}

public class DockerNetworkConfig
{
    public string NetworkName { get; set; } = string.Empty;
    public string? IpAddress { get; set; }
    public string? Gateway { get; set; }
    public string? Subnet { get; set; }
    public string? MacAddress { get; set; }
    public string? NetworkId { get; set; }
    public string? Driver { get; set; }
}

public class DockerServiceDiscoveryResult
{
    public List<DockerService> Services { get; set; } = new();
    public DateTime DiscoveryTime { get; set; } = DateTime.UtcNow;
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
}

public class CreateServiceFromDockerRequest
{
    public string ContainerId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? ServiceUrl { get; set; }
    public int? Port { get; set; }
    public string Environment { get; set; } = "production";
}

public class DockerIpSyncResult
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public int DevicesCreated { get; set; }
    public int DevicesUpdated { get; set; }
    public int TotalContainersScanned { get; set; }
    public List<string> SyncedContainers { get; set; } = new();
}

public class NetworkInterfacesSyncResult
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public int ServerId { get; set; }
    public int DockerContainersSynced { get; set; }
    public int VirtualMachinesSynced { get; set; }
    public int NetworkInterfacesSynced { get; set; }
    public int TotalDevicesSynced { get; set; }
    public List<string> SyncDetails { get; set; } = new();
}

public class BulkSyncResult
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public int TotalServers { get; set; }
    public int SuccessfulServers { get; set; }
    public int FailedServers { get; set; }
    public int TotalDevicesSynced { get; set; }
    public List<ServerSyncSummary> ServerResults { get; set; } = new();
}

public class ServerSyncSummary
{
    public int ServerId { get; set; }
    public string ServerName { get; set; } = string.Empty;
    public bool Success { get; set; }
    public int DevicesSynced { get; set; }
    public string? Details { get; set; }
    public string? ErrorMessage { get; set; }
}

public class IpConflictCheckResult
{
    public bool IsAvailable { get; set; }
    public bool HasConflict { get; set; }
    public List<IpConflictDetail> Conflicts { get; set; } = new();
    public bool IsReachableOnNetwork { get; set; }
    public string? PingResponse { get; set; }
}

public class IpConflictDetail
{
    public string Source { get; set; } = string.Empty; // "Database", "Docker", "VM", "NetworkInterface", "Server"
    public string DeviceName { get; set; } = string.Empty;
    public string? ServerName { get; set; }
    public int? ServerId { get; set; }
    public string? MacAddress { get; set; }
    public string? Details { get; set; }
    public string Status { get; set; } = "Unknown"; // "Online", "Offline"
}

public class DockerNetworkMigrationAnalysis
{
    public int ServerId { get; set; }
    public string ServerName { get; set; } = string.Empty;
    public Dictionary<string, List<DockerContainerInfo>> ContainersByNetwork { get; set; } = new();
    public int TotalContainers { get; set; }
    public int ContainersNeedingMigration { get; set; }
    public List<string> SuggestedIpRange { get; set; } = new();
}

public class DockerContainerInfo
{
    public string ContainerId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Image { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string NetworkMode { get; set; } = string.Empty;
    public string? CurrentIp { get; set; }
    public string? SuggestedIp { get; set; }
    public bool IsRunning { get; set; }
    public bool NeedsMigration { get; set; }
}

public class IpSuggestionRequest
{
    public int ServerId { get; set; }
    public List<string> ContainerIds { get; set; } = new();
    public string TargetNetwork { get; set; } = "bond0";
    public string IpRangeStart { get; set; } = "192.168.4.100";
    public string IpRangeEnd { get; set; } = "192.168.4.249";
}

public class IpSuggestionResult
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public List<ContainerIpSuggestion> Suggestions { get; set; } = new();
    public int TotalChecked { get; set; }
    public int AvailableIpsFound { get; set; }
}

public class ContainerIpSuggestion
{
    public string ContainerId { get; set; } = string.Empty;
    public string ContainerName { get; set; } = string.Empty;
    public string? CurrentIp { get; set; }
    public string SuggestedIp { get; set; } = string.Empty;
    public bool HasConflict { get; set; }
    public List<IpConflictDetail> Conflicts { get; set; } = new();
}
