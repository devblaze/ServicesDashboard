namespace ServicesDashboard.Models;

public class DockerService
{
    public string ContainerId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Image { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public List<DockerPort> Ports { get; set; } = new();
    public Dictionary<string, string> Labels { get; set; } = new();
    public Dictionary<string, string> Environment { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public string? Description { get; set; }
    public string? ServiceUrl { get; set; }
    public bool IsWebService { get; set; }
}

public class DockerPort
{
    public int ContainerPort { get; set; }
    public int? HostPort { get; set; }
    public string Protocol { get; set; } = "tcp";
    public string? HostIp { get; set; }
}

public class DockerServiceDiscoveryResult
{
    public List<DockerService> Services { get; set; } = new();
    public DateTime DiscoveryTime { get; set; } = DateTime.UtcNow;
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
}

public class CreateServiceFromDockerRequest
{
    public string ContainerId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? ServiceUrl { get; set; }
    public int? Port { get; set; }
    public string Environment { get; set; } = "production";
}
