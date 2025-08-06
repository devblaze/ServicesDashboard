namespace ServicesDashboard.Models.Requests;

public class NetworkScanRequest
{
    public string NetworkRange { get; set; } = string.Empty;
    public int[]? Ports { get; set; }
}