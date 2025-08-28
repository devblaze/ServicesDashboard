namespace ServicesDashboard.Models.Requests;

public class NetworkScanRequest
{
    public string NetworkRange { get; set; } = string.Empty;
    public int[]? Ports { get; set; }
    public bool FullScan { get; set; } = false;
}