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
    
    // Helper properties for UI
    public string StatusColor => Status.ToLower() switch
    {
        "running" => "green",
        "exited" => "red",
        "paused" => "yellow",
        "restarting" => "blue",
        _ => "gray"
    };
    
    public bool IsRunning => Status.Equals("running", StringComparison.OrdinalIgnoreCase);
    
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
