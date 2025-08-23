
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ServicesDashboard.Models.ServerManagement;

public class ManagedServer
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(255)]
    public string HostAddress { get; set; } = string.Empty;
    
    public int? SshPort { get; set; } = 22;
    
    [MaxLength(100)]
    public string? Username { get; set; }
    
    public string? EncryptedPassword { get; set; }
    
    public string? SshKeyPath { get; set; }
    
    [Required]
    public ServerType Type { get; set; }
    
    [Required]
    public ServerStatus Status { get; set; } = ServerStatus.Unknown;
    
    public string? OperatingSystem { get; set; }
    
    public string? SystemInfo { get; set; }
    
    public DateTime? LastCheckTime { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public string? Tags { get; set; } // JSON array of tags
    
    // Navigation properties
    public virtual ICollection<ServerHealthCheck> HealthChecks { get; set; } = new List<ServerHealthCheck>();
    public virtual ICollection<UpdateReport> UpdateReports { get; set; } = new List<UpdateReport>();
    public virtual ICollection<ServerAlert> Alerts { get; set; } = new List<ServerAlert>();
}

public class ServerHealthCheck
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int ServerId { get; set; }
    
    public DateTime CheckTime { get; set; } = DateTime.UtcNow;
    
    public bool IsHealthy { get; set; }
    
    public double? CpuUsage { get; set; }
    
    public double? MemoryUsage { get; set; }
    
    public double? DiskUsage { get; set; }
    
    public double? LoadAverage { get; set; }
    
    public int? RunningProcesses { get; set; }
    
    public string? ErrorMessage { get; set; }
    
    public string? RawData { get; set; } // JSON with additional metrics
    
    // Navigation property
    [ForeignKey("ServerId")]
    public virtual ManagedServer Server { get; set; } = null!;
}

public class UpdateReport
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int ServerId { get; set; }
    
    public DateTime ScanTime { get; set; } = DateTime.UtcNow;
    
    public int AvailableUpdates { get; set; }
    
    public int SecurityUpdates { get; set; }
    
    public string? PackageDetails { get; set; } // JSON with package info
    
    public UpdateStatus Status { get; set; } = UpdateStatus.Pending;
    
    public string? AiRecommendation { get; set; }
    
    public double? AiConfidence { get; set; }
    
    // Navigation property
    [ForeignKey("ServerId")]
    public virtual ManagedServer Server { get; set; } = null!;
}

public class ServerAlert
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int ServerId { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [Required]
    public AlertType Type { get; set; }
    
    [Required]
    public AlertSeverity Severity { get; set; }
    
    [Required]
    [MaxLength(500)]
    public string Message { get; set; } = string.Empty;
    
    public string? Details { get; set; }
    
    public bool IsResolved { get; set; } = false;
    
    public DateTime? ResolvedAt { get; set; }
    
    public string? Resolution { get; set; }
    
    // Navigation property
    [ForeignKey("ServerId")]
    public virtual ManagedServer Server { get; set; } = null!;
}

public enum ServerType
{
    Server,
    RaspberryPi,
    VirtualMachine,
    Container,
    Other
}

public enum ServerStatus
{
    Unknown,
    Online,
    Offline,
    Warning,
    Critical,
    Maintenance
}

public enum UpdateStatus
{
    Pending,
    InProgress,
    Completed,
    Failed,
    Skipped
}

public enum AlertType
{
    HighCpuUsage,
    HighMemoryUsage,
    HighDiskUsage,
    ServiceDown,
    UpdatesAvailable,
    SecurityAlert,
    ConnectionLost,
    Custom
}

public enum AlertSeverity
{
    Low,
    Medium,
    High,
    Critical
}
