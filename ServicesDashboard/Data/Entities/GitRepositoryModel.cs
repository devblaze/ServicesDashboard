using System.ComponentModel.DataAnnotations;

namespace ServicesDashboard.Data.Entities;

public class GitRepository
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int GitProviderConnectionId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string FullName { get; set; } = string.Empty; // e.g., "owner/repo"

    [Required]
    [MaxLength(1000)]
    public string CloneUrl { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? WebUrl { get; set; }

    [MaxLength(500)]
    public string? DefaultBranch { get; set; } = "main";

    [MaxLength(1000)]
    public string? Description { get; set; }

    public bool IsPrivate { get; set; }

    public DateTime? LastSyncedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public GitProviderConnection GitProviderConnection { get; set; } = null!;
    public ICollection<Deployment> Deployments { get; set; } = new List<Deployment>();
    public ICollection<GitBranch> Branches { get; set; } = new List<GitBranch>();
}
