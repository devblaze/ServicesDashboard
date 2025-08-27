namespace ServicesDashboard.Models.Requests;

public class CreateServerRequest
{
    public string Name { get; set; } = string.Empty;
    public string HostAddress { get; set; } = string.Empty;
    public int? SshPort { get; set; } = 22;
    public string? Username { get; set; }
    public string? Password { get; set; } // Plain text
    public string? Type { get; set; }
    public string? Tags { get; set; }
}