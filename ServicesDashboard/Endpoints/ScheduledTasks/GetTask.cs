using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Tasks;

namespace ServicesDashboard.Endpoints.ScheduledTasks;

public class GetTaskRequest
{
    public int Id { get; set; }
}

public class GetTaskEndpoint : Endpoint<GetTaskRequest, ScheduledTaskDto>
{
    private readonly IScheduledTaskService _scheduledTaskService;
    private readonly ILogger<GetTaskEndpoint> _logger;

    public GetTaskEndpoint(
        IScheduledTaskService scheduledTaskService,
        ILogger<GetTaskEndpoint> logger)
    {
        _scheduledTaskService = scheduledTaskService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/scheduledtasks/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetTaskRequest req, CancellationToken ct)
    {
        try
        {
            var task = await _scheduledTaskService.GetTaskAsync(req.Id);
            if (task == null)
            {
                await Send.NotFoundAsync(ct);
            return;
            }

            await Send.OkAsync(task, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting scheduled task {TaskId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
