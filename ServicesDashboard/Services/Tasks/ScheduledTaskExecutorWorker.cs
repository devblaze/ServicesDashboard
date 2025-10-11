using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;
using ServicesDashboard.Models;

namespace ServicesDashboard.Services.Tasks;

public class ScheduledTaskExecutorWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ScheduledTaskExecutorWorker> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1);

    public ScheduledTaskExecutorWorker(
        IServiceProvider serviceProvider,
        ILogger<ScheduledTaskExecutorWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Scheduled Task Executor Worker started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckAndExecuteTasksAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Scheduled Task Executor Worker");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }

        _logger.LogInformation("Scheduled Task Executor Worker stopped");
    }

    private async Task CheckAndExecuteTasksAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();
        var taskService = scope.ServiceProvider.GetRequiredService<IScheduledTaskService>();

        // Find tasks that should be executed
        var now = DateTime.UtcNow;
        var tasksToExecute = await context.ScheduledTasks
            .Include(t => t.TaskServers)
                .ThenInclude(ts => ts.Server)
            .Where(t => t.IsEnabled &&
                       t.NextExecutionTime.HasValue &&
                       t.NextExecutionTime.Value <= now)
            .ToListAsync(stoppingToken);

        if (tasksToExecute.Count == 0)
        {
            return;
        }

        _logger.LogInformation("Found {Count} scheduled tasks to execute", tasksToExecute.Count);

        foreach (var task in tasksToExecute)
        {
            if (stoppingToken.IsCancellationRequested)
                break;

            try
            {
                await ExecuteScheduledTaskAsync(task, taskService, context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to execute scheduled task '{TaskName}' (ID: {TaskId})",
                    task.Name, task.Id);
            }
        }
    }

    private async Task ExecuteScheduledTaskAsync(
        ScheduledTask task,
        IScheduledTaskService taskService,
        ServicesDashboardContext context)
    {
        _logger.LogInformation("Executing scheduled task '{TaskName}' (ID: {TaskId}) on {ServerCount} servers",
            task.Name, task.Id, task.TaskServers.Count);

        // Execute on all configured servers in parallel
        var executionTasks = task.TaskServers
            .Select(ts => taskService.ExecuteTaskOnServerAsync(task, ts.Server))
            .ToList();

        await Task.WhenAll(executionTasks);

        // Update task execution times
        task.LastExecutionTime = DateTime.UtcNow;
        task.NextExecutionTime = taskService.GetNextExecutionTime(task.CronExpression, task.TimeZone);
        task.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();

        _logger.LogInformation(
            "Completed execution of scheduled task '{TaskName}' (ID: {TaskId}). Next execution: {NextExecution}",
            task.Name, task.Id, task.NextExecutionTime);
    }
}
