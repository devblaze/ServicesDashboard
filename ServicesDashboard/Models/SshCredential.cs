using System.ComponentModel.DataAnnotations;

namespace ServicesDashboard.Models;

public class SshCredential
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty; // Friendly name for the credential set

    [Required]
    [MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty; // Should be encrypted in production

    [MaxLength(500)]
    public string? Description { get; set; }

    public int? DefaultPort { get; set; } = 22;

    public bool IsDefault { get; set; } = false; // Mark one as default for quick selection

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    // Optional: Track which servers use this credential
    public virtual ICollection<ManagedServer>? ServersUsingCredential { get; set; }
}

public class SshCredentialDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? DefaultPort { get; set; }
    public bool IsDefault { get; set; }
    public DateTime CreatedAt { get; set; }
    public int? UsageCount { get; set; } // How many servers use this credential
}

public class CreateSshCredentialRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Username { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;

    public string? Description { get; set; }

    public int? DefaultPort { get; set; } = 22;

    public bool IsDefault { get; set; } = false;
}

public class UpdateSshCredentialRequest
{
    public string? Name { get; set; }
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string? Description { get; set; }
    public int? DefaultPort { get; set; }
    public bool? IsDefault { get; set; }
}