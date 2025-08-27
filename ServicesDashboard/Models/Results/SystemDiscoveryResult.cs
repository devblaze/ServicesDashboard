
namespace ServicesDashboard.Models.Results;

public class SystemDiscoveryResult
{
    public DateTime DiscoveryTime { get; set; }
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public string OperatingSystem { get; set; } = "";
    public string OsVersion { get; set; } = "";
    public string Architecture { get; set; } = "";
    public string KernelVersion { get; set; } = "";
    public string Hostname { get; set; } = "";
    public string SystemUptime { get; set; } = "";
    public string TotalMemory { get; set; } = "";
    public int AvailableUpdates { get; set; }
    public int SecurityUpdates { get; set; }
    public string PackageManager { get; set; } = "";
    public int InstalledPackages { get; set; }
    public List<string> RunningServices { get; set; } = new();
    public List<string> NetworkInterfaces { get; set; } = new();
    public string SystemLoad { get; set; } = "";
    public List<string> DiskInfo { get; set; } = new();
    public double AiConfidence { get; set; }
    public Dictionary<string, string> RawSystemData { get; set; } = new();
}
