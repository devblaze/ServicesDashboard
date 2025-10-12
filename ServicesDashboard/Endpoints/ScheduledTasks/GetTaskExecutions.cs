using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Tasks;

namespace ServicesDashboard.Endpoints.ScheduledTasks;

public class GetTaskExecutionsRequest
{
    public int Id { get; set; }
    public int? Limit { get; set; } = 50;
}

public class GetTaskExecutionsEndpoint : Endpoint<GetTaskExecutionsRequest, IEnumerable<TaskExecutionDto>>
{
    private readonly IScheduledTaskService _scheduledTaskService;
    private readonly ILogger<GetTaskExecutionsEndpoint> _logger;

    public GetTaskExecutionsEndpoint(
        IScheduledTaskService scheduledTaskService,
        ILogger<GetTaskExecutionsEndpoint> logger)
    {
        _scheduledTaskService = scheduledTaskService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/scheduledtasks/{id}/executions");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetTaskExecutionsRequest req, CancellationToken ct)
    {
        try
        {
            var executions = await _scheduledTaskService.GetTaskExecutionsAsync(req.Id, req.Limit);
            await Send.OkAsync(executions, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting executions for task {TaskId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
