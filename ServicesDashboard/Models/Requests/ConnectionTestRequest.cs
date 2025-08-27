namespace ServicesDashboard.Models.Requests;

public class ConnectionTestRequest
{
    public string HostAddress { get; set; } = string.Empty;
    public int? SshPort { get; set; } = 22;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string? Type { get; set; }
    public string? Tags { get; set; }
}