using System.ComponentModel.DataAnnotations;
using ServicesDashboard.Models;

namespace ServicesDashboard.Data.Entities;

public class PortAllocation
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int ServerId { get; set; }

    [Required]
    public int DeploymentId { get; set; }

    [Required]
    public int Port { get; set; }

    [MaxLength(100)]
    public string? ServiceName { get; set; }

    [MaxLength(200)]
    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime AllocatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ManagedServer Server { get; set; } = null!;
    public Deployment Deployment { get; set; } = null!;
}
