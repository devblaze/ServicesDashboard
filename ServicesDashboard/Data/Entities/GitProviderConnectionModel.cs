using System.ComponentModel.DataAnnotations;

namespace ServicesDashboard.Data.Entities;

public enum GitProviderType
{
    GitHub,
    GitLab,
    Gitea
}

public class GitProviderConnection
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public GitProviderType ProviderType { get; set; }

    [Required]
    [MaxLength(500)]
    public string BaseUrl { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string AccessToken { get; set; } = string.Empty; // Encrypted

    [MaxLength(200)]
    public string? Username { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<GitRepository> Repositories { get; set; } = new List<GitRepository>();
}
