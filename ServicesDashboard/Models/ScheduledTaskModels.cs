using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using ServicesDashboard.Models.Dtos;

namespace ServicesDashboard.Models;

public class ScheduledTask
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    [Required]
    public string Command { get; set; } = string.Empty;

    // Cron expression for scheduling (e.g., "0 0 * * *" for daily at midnight)
    [Required]
    [MaxLength(100)]
    public string CronExpression { get; set; } = string.Empty;

    // Timezone for schedule execution
    [MaxLength(100)]
    public string TimeZone { get; set; } = "UTC";

    public bool IsEnabled { get; set; } = true;

    // Execution timeout in seconds (default 5 minutes)
    public int TimeoutSeconds { get; set; } = 300;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? LastExecutionTime { get; set; }

    public DateTime? NextExecutionTime { get; set; }

    [MaxLength(100)]
    public string? CreatedBy { get; set; }

    // Navigation properties
    public virtual ICollection<ScheduledTaskServer> TaskServers { get; set; } = new List<ScheduledTaskServer>();
    public virtual ICollection<TaskExecution> Executions { get; set; } = new List<TaskExecution>();
}

// Junction table for many-to-many relationship between ScheduledTask and ManagedServer
public class ScheduledTaskServer
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int ScheduledTaskId { get; set; }

    [Required]
    public int ServerId { get; set; }

    // Navigation properties
    [JsonIgnore]
    [ForeignKey("ScheduledTaskId")]
    public virtual ScheduledTask ScheduledTask { get; set; } = null!;

    [ForeignKey("ServerId")]
    public virtual ManagedServer Server { get; set; } = null!;
}

public class TaskExecution
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int ScheduledTaskId { get; set; }

    [Required]
    public int ServerId { get; set; }

    public DateTime StartedAt { get; set; } = DateTime.UtcNow;

    public DateTime? CompletedAt { get; set; }

    [Required]
    public TaskExecutionStatus Status { get; set; } = TaskExecutionStatus.Running;

    public string? Output { get; set; }

    public string? ErrorOutput { get; set; }

    public int? ExitCode { get; set; }

    public int DurationMs { get; set; }

    // Navigation properties
    [JsonIgnore]
    [ForeignKey("ScheduledTaskId")]
    public virtual ScheduledTask ScheduledTask { get; set; } = null!;

    [ForeignKey("ServerId")]
    public virtual ManagedServer Server { get; set; } = null!;
}

public enum TaskExecutionStatus
{
    Pending,
    Running,
    Completed,
    Failed,
    TimedOut,
    Cancelled
}

// DTOs
public class ScheduledTaskDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Command { get; set; } = string.Empty;
    public string CronExpression { get; set; } = string.Empty;
    public string TimeZone { get; set; } = "UTC";
    public bool IsEnabled { get; set; }
    public int TimeoutSeconds { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastExecutionTime { get; set; }
    public DateTime? NextExecutionTime { get; set; }
    public string? CreatedBy { get; set; }
    public List<ServerSummaryDto> Servers { get; set; } = new();
    public int TotalExecutions { get; set; }
    public int SuccessfulExecutions { get; set; }
    public int FailedExecutions { get; set; }
}

public class CreateScheduledTaskRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    [Required]
    public string Command { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string CronExpression { get; set; } = string.Empty;

    [MaxLength(100)]
    public string TimeZone { get; set; } = "UTC";

    public bool IsEnabled { get; set; } = true;

    public int TimeoutSeconds { get; set; } = 300;

    [Required]
    [MinLength(1)]
    public List<int> ServerIds { get; set; } = new();
}

public class UpdateScheduledTaskRequest
{
    [MaxLength(200)]
    public string? Name { get; set; }

    [MaxLength(1000)]
    public string? Description { get; set; }

    public string? Command { get; set; }

    [MaxLength(100)]
    public string? CronExpression { get; set; }

    [MaxLength(100)]
    public string? TimeZone { get; set; }

    public bool? IsEnabled { get; set; }

    public int? TimeoutSeconds { get; set; }

    public List<int>? ServerIds { get; set; }
}

public class TaskExecutionDto
{
    public int Id { get; set; }
    public int ScheduledTaskId { get; set; }
    public string ScheduledTaskName { get; set; } = string.Empty;
    public int ServerId { get; set; }
    public string ServerName { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public TaskExecutionStatus Status { get; set; }
    public string? Output { get; set; }
    public string? ErrorOutput { get; set; }
    public int? ExitCode { get; set; }
    public int DurationMs { get; set; }
}

public class ManualExecutionRequest
{
    [Required]
    [MinLength(1)]
    public List<int> ServerIds { get; set; } = new();
}
