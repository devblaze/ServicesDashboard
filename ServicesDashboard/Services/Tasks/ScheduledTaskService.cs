using System.Diagnostics;
using Cronos;
using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Services.Tasks;

public interface IScheduledTaskService
{
    Task<IEnumerable<ScheduledTaskDto>> GetTasksAsync();
    Task<ScheduledTaskDto?> GetTaskAsync(int id);
    Task<ScheduledTask> CreateTaskAsync(CreateScheduledTaskRequest request);
    Task<ScheduledTask?> UpdateTaskAsync(int id, UpdateScheduledTaskRequest request);
    Task<bool> DeleteTaskAsync(int id);
    Task<bool> ToggleTaskAsync(int id, bool enabled);
    Task<IEnumerable<TaskExecutionDto>> GetTaskExecutionsAsync(int taskId, int? limit = 50);
    Task<IEnumerable<TaskExecutionDto>> GetServerExecutionsAsync(int serverId, int? limit = 50);
    Task<List<TaskExecution>> ExecuteTaskManuallyAsync(int taskId, List<int> serverIds);
    Task<TaskExecution> ExecuteTaskOnServerAsync(ScheduledTask task, ManagedServer server);
    Task<bool> ValidateCronExpression(string cronExpression);
    DateTime? GetNextExecutionTime(string cronExpression, string timeZone);
}

public class ScheduledTaskService : IScheduledTaskService
{
    private readonly ServicesDashboardContext _context;
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<ScheduledTaskService> _logger;

    public ScheduledTaskService(
        ServicesDashboardContext context,
        IServerManagementService serverManagementService,
        ILogger<ScheduledTaskService> logger)
    {
        _context = context;
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public async Task<IEnumerable<ScheduledTaskDto>> GetTasksAsync()
    {
        var tasks = await _context.ScheduledTasks
            .Include(t => t.TaskServers)
                .ThenInclude(ts => ts.Server)
            .Include(t => t.Executions)
            .ToListAsync();

        return tasks.Select(MapToDto);
    }

    public async Task<ScheduledTaskDto?> GetTaskAsync(int id)
    {
        var task = await _context.ScheduledTasks
            .Include(t => t.TaskServers)
                .ThenInclude(ts => ts.Server)
            .Include(t => t.Executions)
            .FirstOrDefaultAsync(t => t.Id == id);

        return task != null ? MapToDto(task) : null;
    }

    public async Task<ScheduledTask> CreateTaskAsync(CreateScheduledTaskRequest request)
    {
        // Validate cron expression
        if (!await ValidateCronExpression(request.CronExpression))
        {
            throw new ArgumentException($"Invalid cron expression: {request.CronExpression}");
        }

        // Validate servers exist
        var servers = await _context.ManagedServers
            .Where(s => request.ServerIds.Contains(s.Id))
            .ToListAsync();

        if (servers.Count != request.ServerIds.Count)
        {
            throw new ArgumentException("One or more server IDs are invalid");
        }

        var task = new ScheduledTask
        {
            Name = request.Name,
            Description = request.Description,
            Command = request.Command,
            CronExpression = request.CronExpression,
            TimeZone = request.TimeZone,
            IsEnabled = request.IsEnabled,
            TimeoutSeconds = request.TimeoutSeconds,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            NextExecutionTime = GetNextExecutionTime(request.CronExpression, request.TimeZone)
        };

        _context.ScheduledTasks.Add(task);
        await _context.SaveChangesAsync();

        // Add task-server relationships
        foreach (var serverId in request.ServerIds)
        {
            _context.ScheduledTaskServers.Add(new ScheduledTaskServer
            {
                ScheduledTaskId = task.Id,
                ServerId = serverId
            });
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Created scheduled task '{TaskName}' (ID: {TaskId}) for {ServerCount} servers",
            task.Name, task.Id, request.ServerIds.Count);

        return task;
    }

    public async Task<ScheduledTask?> UpdateTaskAsync(int id, UpdateScheduledTaskRequest request)
    {
        var task = await _context.ScheduledTasks
            .Include(t => t.TaskServers)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (task == null)
            return null;

        // Update basic properties
        if (!string.IsNullOrWhiteSpace(request.Name))
            task.Name = request.Name;

        if (request.Description != null)
            task.Description = request.Description;

        if (!string.IsNullOrWhiteSpace(request.Command))
            task.Command = request.Command;

        if (!string.IsNullOrWhiteSpace(request.CronExpression))
        {
            if (!await ValidateCronExpression(request.CronExpression))
            {
                throw new ArgumentException($"Invalid cron expression: {request.CronExpression}");
            }
            task.CronExpression = request.CronExpression;
        }

        if (!string.IsNullOrWhiteSpace(request.TimeZone))
            task.TimeZone = request.TimeZone;

        if (request.IsEnabled.HasValue)
            task.IsEnabled = request.IsEnabled.Value;

        if (request.TimeoutSeconds.HasValue)
            task.TimeoutSeconds = request.TimeoutSeconds.Value;

        // Update next execution time if cron or timezone changed
        if (!string.IsNullOrWhiteSpace(request.CronExpression) || !string.IsNullOrWhiteSpace(request.TimeZone))
        {
            task.NextExecutionTime = GetNextExecutionTime(task.CronExpression, task.TimeZone);
        }

        // Update server associations if provided
        if (request.ServerIds != null && request.ServerIds.Count > 0)
        {
            // Validate servers exist
            var servers = await _context.ManagedServers
                .Where(s => request.ServerIds.Contains(s.Id))
                .ToListAsync();

            if (servers.Count != request.ServerIds.Count)
            {
                throw new ArgumentException("One or more server IDs are invalid");
            }

            // Remove existing associations
            _context.ScheduledTaskServers.RemoveRange(task.TaskServers);

            // Add new associations
            foreach (var serverId in request.ServerIds)
            {
                _context.ScheduledTaskServers.Add(new ScheduledTaskServer
                {
                    ScheduledTaskId = task.Id,
                    ServerId = serverId
                });
            }
        }

        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated scheduled task '{TaskName}' (ID: {TaskId})", task.Name, task.Id);

        return task;
    }

    public async Task<bool> DeleteTaskAsync(int id)
    {
        var task = await _context.ScheduledTasks.FindAsync(id);
        if (task == null)
            return false;

        _context.ScheduledTasks.Remove(task);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted scheduled task '{TaskName}' (ID: {TaskId})", task.Name, task.Id);

        return true;
    }

    public async Task<bool> ToggleTaskAsync(int id, bool enabled)
    {
        var task = await _context.ScheduledTasks.FindAsync(id);
        if (task == null)
            return false;

        task.IsEnabled = enabled;
        task.UpdatedAt = DateTime.UtcNow;

        // Update next execution time if enabling
        if (enabled)
        {
            task.NextExecutionTime = GetNextExecutionTime(task.CronExpression, task.TimeZone);
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("{Action} scheduled task '{TaskName}' (ID: {TaskId})",
            enabled ? "Enabled" : "Disabled", task.Name, task.Id);

        return true;
    }

    public async Task<IEnumerable<TaskExecutionDto>> GetTaskExecutionsAsync(int taskId, int? limit = 50)
    {
        var executions = await _context.TaskExecutions
            .Where(e => e.ScheduledTaskId == taskId)
            .Include(e => e.Server)
            .Include(e => e.ScheduledTask)
            .OrderByDescending(e => e.StartedAt)
            .Take(limit ?? 50)
            .ToListAsync();

        return executions.Select(MapExecutionToDto);
    }

    public async Task<IEnumerable<TaskExecutionDto>> GetServerExecutionsAsync(int serverId, int? limit = 50)
    {
        var executions = await _context.TaskExecutions
            .Where(e => e.ServerId == serverId)
            .Include(e => e.Server)
            .Include(e => e.ScheduledTask)
            .OrderByDescending(e => e.StartedAt)
            .Take(limit ?? 50)
            .ToListAsync();

        return executions.Select(MapExecutionToDto);
    }

    public async Task<List<TaskExecution>> ExecuteTaskManuallyAsync(int taskId, List<int> serverIds)
    {
        var task = await _context.ScheduledTasks.FindAsync(taskId);
        if (task == null)
        {
            throw new ArgumentException($"Task with ID {taskId} not found");
        }

        // Validate servers
        var servers = await _context.ManagedServers
            .Where(s => serverIds.Contains(s.Id))
            .ToListAsync();

        if (servers.Count != serverIds.Count)
        {
            throw new ArgumentException("One or more server IDs are invalid");
        }

        var executions = new List<TaskExecution>();

        foreach (var server in servers)
        {
            var execution = await ExecuteTaskOnServerAsync(task, server);
            executions.Add(execution);
        }

        // Update last execution time
        task.LastExecutionTime = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return executions;
    }

    public Task<bool> ValidateCronExpression(string cronExpression)
    {
        try
        {
            var expression = CronExpression.Parse(cronExpression, CronFormat.IncludeSeconds);
            return Task.FromResult(true);
        }
        catch
        {
            return Task.FromResult(false);
        }
    }

    public DateTime? GetNextExecutionTime(string cronExpression, string timeZone)
    {
        try
        {
            var expression = CronExpression.Parse(cronExpression, CronFormat.IncludeSeconds);
            var tz = TimeZoneInfo.FindSystemTimeZoneById(timeZone);
            var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
            var next = expression.GetNextOccurrence(now, tz);

            return next.HasValue ? TimeZoneInfo.ConvertTimeToUtc(next.Value, tz) : null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to calculate next execution time for cron: {Cron}, timezone: {TimeZone}",
                cronExpression, timeZone);
            return null;
        }
    }

    public async Task<TaskExecution> ExecuteTaskOnServerAsync(ScheduledTask task, ManagedServer server)
    {
        var execution = new TaskExecution
        {
            ScheduledTaskId = task.Id,
            ServerId = server.Id,
            StartedAt = DateTime.UtcNow,
            Status = TaskExecutionStatus.Running
        };

        _context.TaskExecutions.Add(execution);
        await _context.SaveChangesAsync();

        var sw = Stopwatch.StartNew();

        try
        {
            _logger.LogInformation("Executing task '{TaskName}' on server '{ServerName}'", task.Name, server.Name);

            // Execute command with timeout
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(task.TimeoutSeconds));

            var result = await _serverManagementService.ExecuteCommandAsync(server.Id, task.Command);

            sw.Stop();

            execution.CompletedAt = DateTime.UtcNow;
            execution.DurationMs = (int)sw.ElapsedMilliseconds;
            execution.Output = result.Output;
            execution.ErrorOutput = result.Error;
            execution.ExitCode = result.ExitCode;
            execution.Status = result.ExitCode == 0 ? TaskExecutionStatus.Completed : TaskExecutionStatus.Failed;

            _logger.LogInformation(
                "Task '{TaskName}' on server '{ServerName}' completed with exit code {ExitCode} in {Duration}ms",
                task.Name, server.Name, result.ExitCode, sw.ElapsedMilliseconds);
        }
        catch (OperationCanceledException)
        {
            sw.Stop();
            execution.CompletedAt = DateTime.UtcNow;
            execution.DurationMs = (int)sw.ElapsedMilliseconds;
            execution.Status = TaskExecutionStatus.TimedOut;
            execution.ErrorOutput = $"Task execution timed out after {task.TimeoutSeconds} seconds";

            _logger.LogWarning("Task '{TaskName}' on server '{ServerName}' timed out after {Timeout} seconds",
                task.Name, server.Name, task.TimeoutSeconds);
        }
        catch (Exception ex)
        {
            sw.Stop();
            execution.CompletedAt = DateTime.UtcNow;
            execution.DurationMs = (int)sw.ElapsedMilliseconds;
            execution.Status = TaskExecutionStatus.Failed;
            execution.ErrorOutput = ex.Message;

            _logger.LogError(ex, "Task '{TaskName}' on server '{ServerName}' failed with error",
                task.Name, server.Name);
        }

        await _context.SaveChangesAsync();
        return execution;
    }

    private ScheduledTaskDto MapToDto(ScheduledTask task)
    {
        var executions = task.Executions.ToList();
        return new ScheduledTaskDto
        {
            Id = task.Id,
            Name = task.Name,
            Description = task.Description,
            Command = task.Command,
            CronExpression = task.CronExpression,
            TimeZone = task.TimeZone,
            IsEnabled = task.IsEnabled,
            TimeoutSeconds = task.TimeoutSeconds,
            CreatedAt = task.CreatedAt,
            UpdatedAt = task.UpdatedAt,
            LastExecutionTime = task.LastExecutionTime,
            NextExecutionTime = task.NextExecutionTime,
            CreatedBy = task.CreatedBy,
            Servers = task.TaskServers.Select(ts => new ServerSummaryDto
            {
                Id = ts.Server.Id,
                Name = ts.Server.Name,
                HostAddress = ts.Server.HostAddress,
                Status = ts.Server.Status.ToString(),
                Type = ts.Server.Type.ToString()
            }).ToList(),
            TotalExecutions = executions.Count,
            SuccessfulExecutions = executions.Count(e => e.Status == TaskExecutionStatus.Completed),
            FailedExecutions = executions.Count(e => e.Status == TaskExecutionStatus.Failed || e.Status == TaskExecutionStatus.TimedOut)
        };
    }

    private TaskExecutionDto MapExecutionToDto(TaskExecution execution)
    {
        return new TaskExecutionDto
        {
            Id = execution.Id,
            ScheduledTaskId = execution.ScheduledTaskId,
            ScheduledTaskName = execution.ScheduledTask?.Name ?? "Unknown",
            ServerId = execution.ServerId,
            ServerName = execution.Server?.Name ?? "Unknown",
            StartedAt = execution.StartedAt,
            CompletedAt = execution.CompletedAt,
            Status = execution.Status,
            Output = execution.Output,
            ErrorOutput = execution.ErrorOutput,
            ExitCode = execution.ExitCode,
            DurationMs = execution.DurationMs
        };
    }
}
