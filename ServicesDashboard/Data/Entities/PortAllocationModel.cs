using System.ComponentModel.DataAnnotations;
using ServicesDashboard.Models;

namespace ServicesDashboard.Data.Entities;

public enum PortAllocationStatus
{
    Available,
    Reserved,
    InUse,
    SystemReserved
}

public enum PortAllocationType
{
    Docker,
    Deployment,
    System,
    Manual
}

public class PortAllocation
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int ServerId { get; set; }

    public int? DeploymentId { get; set; } // Optional - null for Docker containers

    [Required]
    [Range(1, 65535)]
    public int Port { get; set; }

    [Required]
    public PortAllocationStatus Status { get; set; } = PortAllocationStatus.InUse;

    [Required]
    public PortAllocationType AllocationType { get; set; }

    [MaxLength(200)]
    public string? ServiceId { get; set; } // Docker container ID or Deployment ID

    [MaxLength(200)]
    public string? ServiceName { get; set; }

    [MaxLength(200)]
    public string? Description { get; set; }

    public DateTime? AllocatedAt { get; set; }
    public DateTime? ReleasedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ManagedServer Server { get; set; } = null!;
    public Deployment? Deployment { get; set; }
}
