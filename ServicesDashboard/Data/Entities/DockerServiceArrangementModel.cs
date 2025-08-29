using System.ComponentModel.DataAnnotations;
using ServicesDashboard.Models;

namespace ServicesDashboard.Data.Entities;

public class DockerServiceArrangement
{
    public int Id { get; set; }
    
    [Required]
    public string ContainerId { get; set; } = string.Empty;
    
    [Required]
    public string ContainerName { get; set; } = string.Empty;
    
    public int ServerId { get; set; }
    
    public int Order { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation property
    public ManagedServer? Server { get; set; }
}
