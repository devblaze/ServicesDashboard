namespace ServicesDashboard.Models.Dtos;

public class DockerServiceWithServer
{
    public string ContainerId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Image { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public List<DockerPortMapping> Ports { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public int ServerId { get; set; }
    public string ServerName { get; set; } = string.Empty;
    public string ServerHostAddress { get; set; } = string.Empty;
    public int Order { get; set; }

    // Icon properties
    public string? CustomIconUrl { get; set; }
    public string? CustomIconData { get; set; }

    // Helper properties for UI
    public string StatusColor
    {
        get
        {
            var statusLower = Status.ToLower();
            if (statusLower.StartsWith("up")) return "green";
            if (statusLower.StartsWith("exited")) return "red";
            if (statusLower.StartsWith("paused")) return "yellow";
            if (statusLower.StartsWith("restarting")) return "blue";
            return "gray";
        }
    }

    public bool IsRunning => Status.StartsWith("Up", StringComparison.OrdinalIgnoreCase);
    
    public string DisplayImage => Image.Contains(':') ? Image.Split(':')[0] : Image;
    public string ImageTag => Image.Contains(':') ? Image.Split(':')[1] : "latest";
}

public class DockerServiceArrangementDto
{
    public int ServerId { get; set; }
    public string ContainerId { get; set; } = string.Empty;
    public string ContainerName { get; set; } = string.Empty;
    public int Order { get; set; }
}

public class DockerPortMapping
{
    public int PrivatePort { get; set; }
    public int? PublicPort { get; set; }
    public string Type { get; set; } = string.Empty;
    public string IP { get; set; } = string.Empty;
}

public class UpdateDockerServiceIconRequest
{
    public int ServerId { get; set; }
    public string ContainerId { get; set; } = string.Empty;
    public string? IconUrl { get; set; }  // For Docker Hub or external URL
    public string? IconData { get; set; }  // For base64 uploaded image
}
