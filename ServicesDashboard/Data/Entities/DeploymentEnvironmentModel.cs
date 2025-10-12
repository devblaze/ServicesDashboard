using System.ComponentModel.DataAnnotations;

namespace ServicesDashboard.Data.Entities;

public enum EnvironmentType
{
    Production,
    Staging,
    Development,
    UAT,
    Testing,
    Custom
}

public class DeploymentEnvironment
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int DeploymentId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public EnvironmentType Type { get; set; }

    public string? EnvironmentVariables { get; set; } // JSON - Environment-specific vars

    public string? PortMappings { get; set; } // JSON - Environment-specific ports

    [MaxLength(100)]
    public string? Branch { get; set; }

    [MaxLength(100)]
    public string? Tag { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime? LastDeployedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Deployment Deployment { get; set; } = null!;
}
