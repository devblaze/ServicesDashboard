using FastEndpoints;
using ServicesDashboard.Services.Tasks;

namespace ServicesDashboard.Endpoints.ScheduledTasks;

public class ToggleTaskRequest
{
    public int Id { get; set; }
    public bool Enabled { get; set; }
}

public class ToggleTaskEndpoint : Endpoint<ToggleTaskRequest>
{
    private readonly IScheduledTaskService _scheduledTaskService;
    private readonly ILogger<ToggleTaskEndpoint> _logger;

    public ToggleTaskEndpoint(
        IScheduledTaskService scheduledTaskService,
        ILogger<ToggleTaskEndpoint> logger)
    {
        _scheduledTaskService = scheduledTaskService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/scheduledtasks/{id}/toggle");
        AllowAnonymous();
    }

    public override async Task HandleAsync(ToggleTaskRequest req, CancellationToken ct)
    {
        try
        {
            var success = await _scheduledTaskService.ToggleTaskAsync(req.Id, req.Enabled);
            if (!success)
            {
                await Send.NotFoundAsync(ct);
            return;
            }

            await Send.OkAsync(new { message = $"Task {(req.Enabled ? "enabled" : "disabled")} successfully" }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error toggling scheduled task {TaskId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
