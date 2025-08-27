namespace ServicesDashboard.Models.Results;

public class SystemAiAnalysisResult
{
    public string OperatingSystem { get; set; } = "";
    public string OsVersion { get; set; } = "";
    public string Architecture { get; set; } = "";
    public string KernelVersion { get; set; } = "";
    public string Hostname { get; set; } = "";
    public string SystemUptime { get; set; } = "";
    public string TotalMemory { get; set; } = "";
    public int InstalledPackages { get; set; }
    public List<string> RunningServices { get; set; } = new();
    public List<string> NetworkInterfaces { get; set; } = new();
    public string SystemLoad { get; set; } = "";
    public List<string> DiskInfo { get; set; } = new();
    public double Confidence { get; set; }
}