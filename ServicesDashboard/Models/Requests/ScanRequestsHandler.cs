namespace ServicesDashboard.Models.Requests;

public class QuickScanRequest
{
    public string Target { get; set; } = string.Empty; // Can be IP, hostname, or network range
}

public class FullScanRequest
{
    public string Target { get; set; } = string.Empty; // Can be IP, hostname, or network range
}
