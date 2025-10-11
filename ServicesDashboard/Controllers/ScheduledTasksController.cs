using Microsoft.AspNetCore.Mvc;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Tasks;

namespace ServicesDashboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ScheduledTasksController : ControllerBase
{
    private readonly IScheduledTaskService _scheduledTaskService;
    private readonly ILogger<ScheduledTasksController> _logger;

    public ScheduledTasksController(
        IScheduledTaskService scheduledTaskService,
        ILogger<ScheduledTasksController> logger)
    {
        _scheduledTaskService = scheduledTaskService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ScheduledTaskDto>>> GetTasks()
    {
        try
        {
            var tasks = await _scheduledTaskService.GetTasksAsync();
            return Ok(tasks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting scheduled tasks");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ScheduledTaskDto>> GetTask(int id)
    {
        try
        {
            var task = await _scheduledTaskService.GetTaskAsync(id);
            if (task == null)
                return NotFound();

            return Ok(task);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting scheduled task {TaskId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost]
    public async Task<ActionResult<ScheduledTask>> CreateTask([FromBody] CreateScheduledTaskRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var task = await _scheduledTaskService.CreateTaskAsync(request);
            return CreatedAtAction(nameof(GetTask), new { id = task.Id }, task);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid request to create scheduled task");
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating scheduled task");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ScheduledTask>> UpdateTask(int id, [FromBody] UpdateScheduledTaskRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var task = await _scheduledTaskService.UpdateTaskAsync(id, request);
            if (task == null)
                return NotFound();

            return Ok(task);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid request to update scheduled task {TaskId}", id);
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating scheduled task {TaskId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteTask(int id)
    {
        try
        {
            var deleted = await _scheduledTaskService.DeleteTaskAsync(id);
            if (!deleted)
                return NotFound();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting scheduled task {TaskId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("{id}/toggle")]
    public async Task<ActionResult> ToggleTask(int id, [FromBody] ToggleTaskRequest request)
    {
        try
        {
            var success = await _scheduledTaskService.ToggleTaskAsync(id, request.Enabled);
            if (!success)
                return NotFound();

            return Ok(new { message = $"Task {(request.Enabled ? "enabled" : "disabled")} successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error toggling scheduled task {TaskId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("{id}/execute")]
    public async Task<ActionResult<IEnumerable<TaskExecution>>> ExecuteTaskManually(
        int id,
        [FromBody] ManualExecutionRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var executions = await _scheduledTaskService.ExecuteTaskManuallyAsync(id, request.ServerIds);
            return Ok(executions);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid request to execute scheduled task {TaskId}", id);
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing scheduled task {TaskId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("{id}/executions")]
    public async Task<ActionResult<IEnumerable<TaskExecutionDto>>> GetTaskExecutions(int id, [FromQuery] int? limit = 50)
    {
        try
        {
            var executions = await _scheduledTaskService.GetTaskExecutionsAsync(id, limit);
            return Ok(executions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting executions for task {TaskId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("executions/server/{serverId}")]
    public async Task<ActionResult<IEnumerable<TaskExecutionDto>>> GetServerExecutions(int serverId, [FromQuery] int? limit = 50)
    {
        try
        {
            var executions = await _scheduledTaskService.GetServerExecutionsAsync(serverId, limit);
            return Ok(executions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting executions for server {ServerId}", serverId);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("validate-cron")]
    public async Task<ActionResult<CronValidationResponse>> ValidateCronExpression([FromBody] CronValidationRequest request)
    {
        try
        {
            var isValid = await _scheduledTaskService.ValidateCronExpression(request.CronExpression);
            DateTime? nextExecution = null;

            if (isValid)
            {
                nextExecution = _scheduledTaskService.GetNextExecutionTime(
                    request.CronExpression,
                    request.TimeZone ?? "UTC");
            }

            return Ok(new CronValidationResponse
            {
                IsValid = isValid,
                NextExecution = nextExecution
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating cron expression");
            return StatusCode(500, "Internal server error");
        }
    }
}

public class ToggleTaskRequest
{
    public bool Enabled { get; set; }
}

public class CronValidationRequest
{
    public string CronExpression { get; set; } = string.Empty;
    public string? TimeZone { get; set; }
}

public class CronValidationResponse
{
    public bool IsValid { get; set; }
    public DateTime? NextExecution { get; set; }
}
