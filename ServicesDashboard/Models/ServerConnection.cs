namespace ServicesDashboard.Models;

public class ServerConnection
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 22; // Default SSH port
    public string Username { get; set; } = string.Empty;
    public string AuthMethod { get; set; } = "Password"; // Password, PrivateKey
    public string Password { get; set; } = string.Empty;
    public string PrivateKeyPath { get; set; } = string.Empty;
    public string DockerEndpoint { get; set; } = "unix:///var/run/docker.sock"; // Default Docker socket
    public bool IsConnected { get; set; } = false;
    public DateTimeOffset LastConnected { get; set; }
}

public class ServerConnectionDto
{
    public string? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 22;
    public string Username { get; set; } = string.Empty;
    public string AuthMethod { get; set; } = "Password";
    public string? Password { get; set; }
    public string? PrivateKeyPath { get; set; }
    public string DockerEndpoint { get; set; } = "unix:///var/run/docker.sock";
}

public class LogIssue
{
    public string? Type { get; set; }
    public string Severity { get; set; } = "info"; // info, warning, error, critical
    public string Description { get; set; } = string.Empty;
    public string? Suggestion { get; set; }
    public string? LogLine { get; set; }
    public int LineNumber { get; set; }
}