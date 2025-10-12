using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Tasks;

namespace ServicesDashboard.Endpoints.ScheduledTasks;

public class GetTasksEndpoint : EndpointWithoutRequest<IEnumerable<ScheduledTaskDto>>
{
    private readonly IScheduledTaskService _scheduledTaskService;
    private readonly ILogger<GetTasksEndpoint> _logger;

    public GetTasksEndpoint(
        IScheduledTaskService scheduledTaskService,
        ILogger<GetTasksEndpoint> logger)
    {
        _scheduledTaskService = scheduledTaskService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/scheduledtasks");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        try
        {
            var tasks = await _scheduledTaskService.GetTasksAsync();
            await Send.OkAsync(tasks, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting scheduled tasks");
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
