using System.ComponentModel.DataAnnotations;
using ServicesDashboard.Models;

namespace ServicesDashboard.Data.Entities;

public enum DeploymentType
{
    DockerCompose,
    Docker,
    Kubernetes,
    Script
}

public enum DeploymentStatus
{
    Created,
    Building,
    Deploying,
    Running,
    Stopped,
    Failed,
    Updating
}

public class Deployment
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int GitRepositoryId { get; set; }

    [Required]
    public int ServerId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public DeploymentType Type { get; set; }

    [Required]
    public DeploymentStatus Status { get; set; } = DeploymentStatus.Created;

    [MaxLength(100)]
    public string? Branch { get; set; }

    [MaxLength(100)]
    public string? Tag { get; set; }

    [MaxLength(2000)]
    public string? DockerComposeFile { get; set; } // Path to docker-compose.yml

    [MaxLength(2000)]
    public string? Dockerfile { get; set; } // Path to Dockerfile

    [MaxLength(500)]
    public string? BuildContext { get; set; } = ".";

    public string? EnvironmentVariables { get; set; } // JSON

    public string? PortMappings { get; set; } // JSON array of port mappings

    public string? VolumeMappings { get; set; } // JSON array of volume mappings

    public bool AutoDeploy { get; set; } = false; // Auto-deploy on git push

    [MaxLength(500)]
    public string? DeploymentPath { get; set; } // Path on server where it's deployed

    public string? AiSuggestions { get; set; } // JSON - AI-generated suggestions

    public DateTime? LastDeployedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public GitRepository GitRepository { get; set; } = null!;
    public ManagedServer Server { get; set; } = null!;
    public ICollection<DeploymentEnvironment> Environments { get; set; } = new List<DeploymentEnvironment>();
    public ICollection<PortAllocation> AllocatedPorts { get; set; } = new List<PortAllocation>();
}
