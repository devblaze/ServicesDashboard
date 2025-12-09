using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace ServicesDashboard.Models;

/// <summary>
/// System-level metrics including network totals and temperatures
/// </summary>
public class SystemMetricsHistory
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int ServerId { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    // Network (aggregated across all interfaces)
    public long NetworkRxBytes { get; set; }
    public long NetworkTxBytes { get; set; }
    public long NetworkRxBytesPerSec { get; set; }
    public long NetworkTxBytesPerSec { get; set; }

    // Temperature (primary sensors)
    public float? CpuTemperature { get; set; }
    public float? GpuTemperature { get; set; }

    // Navigation property
    [JsonIgnore]
    [ForeignKey("ServerId")]
    public virtual ManagedServer Server { get; set; } = null!;
}

/// <summary>
/// Per-disk metrics for array, cache, and system disks
/// </summary>
public class DiskMetricsHistory
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int ServerId { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    // Disk identification
    [Required]
    [MaxLength(100)]
    public string DiskName { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string DiskType { get; set; } = string.Empty; // "array", "cache", "parity", "system"

    [MaxLength(255)]
    public string? MountPoint { get; set; }

    [MaxLength(50)]
    public string? Device { get; set; } // e.g., "/dev/sda"

    // Usage metrics
    public long TotalBytes { get; set; }
    public long UsedBytes { get; set; }
    public long FreeBytes { get; set; }
    public float UsagePercentage { get; set; }

    // Temperature (for drives)
    public float? Temperature { get; set; }

    // Status (for Unraid - active, standby, spun_down)
    [MaxLength(50)]
    public string? Status { get; set; }

    // Navigation property
    [JsonIgnore]
    [ForeignKey("ServerId")]
    public virtual ManagedServer Server { get; set; } = null!;
}

/// <summary>
/// Per-network-interface metrics
/// </summary>
public class NetworkInterfaceMetricsHistory
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int ServerId { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    // Interface identification
    [Required]
    [MaxLength(100)]
    public string InterfaceName { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string InterfaceType { get; set; } = string.Empty; // "physical", "bridge", "docker", "virtual"

    // Traffic (cumulative from boot)
    public long RxBytes { get; set; }
    public long TxBytes { get; set; }

    // Rate (calculated from delta between readings)
    public long RxBytesPerSec { get; set; }
    public long TxBytesPerSec { get; set; }

    // Navigation property
    [JsonIgnore]
    [ForeignKey("ServerId")]
    public virtual ManagedServer Server { get; set; } = null!;
}
