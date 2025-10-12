using FastEndpoints;
using ServicesDashboard.Services.Tasks;

namespace ServicesDashboard.Endpoints.ScheduledTasks;

public class DeleteTaskRequest
{
    public int Id { get; set; }
}

public class DeleteTaskEndpoint : Endpoint<DeleteTaskRequest>
{
    private readonly IScheduledTaskService _scheduledTaskService;
    private readonly ILogger<DeleteTaskEndpoint> _logger;

    public DeleteTaskEndpoint(
        IScheduledTaskService scheduledTaskService,
        ILogger<DeleteTaskEndpoint> logger)
    {
        _scheduledTaskService = scheduledTaskService;
        _logger = logger;
    }

    public override void Configure()
    {
        Delete("/api/scheduledtasks/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(DeleteTaskRequest req, CancellationToken ct)
    {
        try
        {
            var deleted = await _scheduledTaskService.DeleteTaskAsync(req.Id);
            if (!deleted)
            {
                await Send.NotFoundAsync(ct);
            return;
            }

            await Send.NoContentAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting scheduled task {TaskId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
