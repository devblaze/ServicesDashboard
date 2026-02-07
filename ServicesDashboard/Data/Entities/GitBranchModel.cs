using System.ComponentModel.DataAnnotations;

namespace ServicesDashboard.Data.Entities;

public class GitBranch
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int RepositoryId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string CommitSha { get; set; } = string.Empty;

    public bool HasAutoDeployment { get; set; } = false;

    public int? DeploymentId { get; set; }

    public DateTime LastCommitAt { get; set; }
    public DateTime DetectedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public GitRepository Repository { get; set; } = null!;
    public Deployment? Deployment { get; set; }
}
