using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Tasks;

namespace ServicesDashboard.Endpoints.ScheduledTasks;

public class ManualExecutionRequest
{
    public int Id { get; set; }
    public List<int> ServerIds { get; set; } = new();
}

public class ExecuteTaskManuallyEndpoint : Endpoint<ManualExecutionRequest, IEnumerable<TaskExecution>>
{
    private readonly IScheduledTaskService _scheduledTaskService;
    private readonly ILogger<ExecuteTaskManuallyEndpoint> _logger;

    public ExecuteTaskManuallyEndpoint(
        IScheduledTaskService scheduledTaskService,
        ILogger<ExecuteTaskManuallyEndpoint> logger)
    {
        _scheduledTaskService = scheduledTaskService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/scheduledtasks/{id}/execute");
        AllowAnonymous();
    }

    public override async Task HandleAsync(ManualExecutionRequest req, CancellationToken ct)
    {
        try
        {
            var executions = await _scheduledTaskService.ExecuteTaskManuallyAsync(req.Id, req.ServerIds);
            await Send.OkAsync(executions, ct);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid request to execute scheduled task {TaskId}", req.Id);
            HttpContext.Response.StatusCode = 400;
            await HttpContext.Response.WriteAsync($@"{{""error"":""{ex.Message.Replace("\"", "\\\"")}""}}", ct);
            return;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing scheduled task {TaskId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
