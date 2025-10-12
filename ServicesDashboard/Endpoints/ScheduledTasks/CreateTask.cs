using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Tasks;

namespace ServicesDashboard.Endpoints.ScheduledTasks;

public class CreateTaskEndpoint : Endpoint<CreateScheduledTaskRequest, ScheduledTask>
{
    private readonly IScheduledTaskService _scheduledTaskService;
    private readonly ILogger<CreateTaskEndpoint> _logger;

    public CreateTaskEndpoint(
        IScheduledTaskService scheduledTaskService,
        ILogger<CreateTaskEndpoint> logger)
    {
        _scheduledTaskService = scheduledTaskService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/scheduledtasks");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CreateScheduledTaskRequest req, CancellationToken ct)
    {
        try
        {
            var task = await _scheduledTaskService.CreateTaskAsync(req);
            await Send.CreatedAtAsync<GetTaskEndpoint>(new { id = task.Id }, task, cancellation: ct);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid request to create scheduled task");
            HttpContext.Response.StatusCode = 400;
            await HttpContext.Response.WriteAsync($@"{{""error"":""{ex.Message.Replace("\"", "\\\"")}""}}", ct);
            return;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating scheduled task");
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
