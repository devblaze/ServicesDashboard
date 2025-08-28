using System.ComponentModel.DataAnnotations;

namespace ServicesDashboard.Models;

public class NetworkScanSession
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [MaxLength(255)]
    public string Target { get; set; } = string.Empty;
    
    public string ScanType { get; set; } = string.Empty; // "network", "host", "quick", "full"
    
    public string Status { get; set; } = "pending"; // "pending", "running", "completed", "failed"
    
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    
    public int TotalHosts { get; set; }
    public int ScannedHosts { get; set; }
    public int TotalPorts { get; set; }
    public int ScannedPorts { get; set; }
    
    public string? ErrorMessage { get; set; }
    
    // Navigation property
    public virtual ICollection<StoredDiscoveredService> DiscoveredServices { get; set; } = new List<StoredDiscoveredService>();
}

public class StoredDiscoveredService
{
    public int Id { get; set; }
    public Guid ScanId { get; set; }
    public string HostAddress { get; set; } = string.Empty;
    public string HostName { get; set; } = string.Empty;
    public int Port { get; set; }
    public bool IsReachable { get; set; }
    public long ResponseTimeMs { get; set; }
    public string ServiceType { get; set; } = string.Empty;
    public string? Banner { get; set; }
    public DateTime DiscoveredAt { get; set; }
    public bool IsActive { get; set; } = true;
    public string ServiceKey { get; set; } = string.Empty;
    
    // Navigation properties
    public NetworkScanSession ScanSession { get; set; } = null!;
    
    // AI Recognition fields
    public string? RecognizedName { get; set; }
    public string? SuggestedDescription { get; set; }
    public string? ServiceCategory { get; set; }
    public string? SuggestedIcon { get; set; }
    public double? AiConfidence { get; set; }
}