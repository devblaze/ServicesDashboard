namespace ServicesDashboard.Models.Requests;

public class HostScanRequest
{
    public string HostAddress { get; set; } = string.Empty;
    public int[]? Ports { get; set; }
}