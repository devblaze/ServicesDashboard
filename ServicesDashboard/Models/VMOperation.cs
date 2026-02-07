using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace ServicesDashboard.Models;

public class VMOperation
{
    [Key]
    public int Id { get; set; }

    public Guid OperationId { get; set; } = Guid.NewGuid();

    [Required]
    public int HostServerId { get; set; }

    public int? CreatedServerId { get; set; }

    [Required]
    [MaxLength(100)]
    public string VMName { get; set; } = string.Empty;

    [Required]
    public VMOperationType OperationType { get; set; }

    [Required]
    public VMOperationStatus Status { get; set; } = VMOperationStatus.Pending;

    public VMPreset Preset { get; set; }

    public VmOsType OsType { get; set; }

    [MaxLength(100)]
    public string? Username { get; set; }

    [JsonIgnore]
    public string? EncryptedPassword { get; set; }

    public int RamMb { get; set; }

    public int VCpus { get; set; }

    public int DiskSizeGb { get; set; } = 50;

    [MaxLength(45)]
    public string? IpAddress { get; set; }

    [MaxLength(255)]
    public string? SshConnectionString { get; set; }

    public int ProgressPercent { get; set; }

    [MaxLength(255)]
    public string? CurrentStage { get; set; }

    public string? ErrorMessage { get; set; }

    public string? OperationLog { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? CompletedAt { get; set; }

    // Navigation properties
    [ForeignKey("HostServerId")]
    [JsonIgnore]
    public virtual ManagedServer HostServer { get; set; } = null!;

    [ForeignKey("CreatedServerId")]
    [JsonIgnore]
    public virtual ManagedServer? CreatedServer { get; set; }
}

public enum VMOperationType
{
    Create,
    Start,
    Stop,
    Delete,
    Restart
}

public enum VMOperationStatus
{
    Pending,
    DownloadingImage,
    PreparingCloudInit,
    CreatingDisk,
    DefiningVM,
    StartingVM,
    WaitingForBoot,
    ConfiguringNetwork,
    Ready,
    Failed,
    Cancelled
}

public enum VMPreset
{
    Small,   // 4GB RAM, 2 vCPUs
    Medium,  // 8GB RAM, 4 vCPUs
    Large,   // 16GB RAM, 8 vCPUs
    Custom
}

public enum VmOsType
{
    Ubuntu2404,
    Ubuntu2204,
    Debian12,
    KaliLinux
}
