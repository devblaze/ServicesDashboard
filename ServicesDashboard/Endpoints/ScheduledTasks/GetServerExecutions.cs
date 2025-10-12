using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Tasks;

namespace ServicesDashboard.Endpoints.ScheduledTasks;

public class GetServerExecutionsRequest
{
    public int ServerId { get; set; }
    public int? Limit { get; set; } = 50;
}

public class GetServerExecutionsEndpoint : Endpoint<GetServerExecutionsRequest, IEnumerable<TaskExecutionDto>>
{
    private readonly IScheduledTaskService _scheduledTaskService;
    private readonly ILogger<GetServerExecutionsEndpoint> _logger;

    public GetServerExecutionsEndpoint(
        IScheduledTaskService scheduledTaskService,
        ILogger<GetServerExecutionsEndpoint> logger)
    {
        _scheduledTaskService = scheduledTaskService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/scheduledtasks/executions/server/{serverId}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetServerExecutionsRequest req, CancellationToken ct)
    {
        try
        {
            var executions = await _scheduledTaskService.GetServerExecutionsAsync(req.ServerId, req.Limit);
            await Send.OkAsync(executions, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting executions for server {ServerId}", req.ServerId);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
