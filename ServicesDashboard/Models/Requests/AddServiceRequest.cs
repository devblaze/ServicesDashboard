namespace ServicesDashboard.Models.Requests;

public class StartScanRequest
{
    public string Target { get; set; } = string.Empty;
    public string ScanType { get; set; } = "network"; // "network", "host", "quick", "full"
    public int[]? Ports { get; set; }
    public bool FullScan { get; set; } = false;
}

