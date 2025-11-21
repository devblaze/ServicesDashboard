using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace ServicesDashboard.Models;

public class ContainerMetricsHistory
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int ServerId { get; set; }

    [Required]
    [MaxLength(64)]
    public string ContainerId { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string ContainerName { get; set; } = string.Empty;

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public float CpuPercentage { get; set; }

    public long MemoryUsageBytes { get; set; }

    public float MemoryPercentage { get; set; }

    public long MemoryLimitBytes { get; set; }

    public long NetworkRxBytes { get; set; }

    public long NetworkTxBytes { get; set; }

    public long BlockReadBytes { get; set; }

    public long BlockWriteBytes { get; set; }

    // Navigation property
    [JsonIgnore]
    [ForeignKey("ServerId")]
    public virtual ManagedServer Server { get; set; } = null!;
}
