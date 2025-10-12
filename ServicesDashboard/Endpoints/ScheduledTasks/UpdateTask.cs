using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Tasks;

namespace ServicesDashboard.Endpoints.ScheduledTasks;

public class UpdateTaskRequest
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Command { get; set; }
    public string? CronExpression { get; set; }
    public string? TimeZone { get; set; }
    public List<int>? ServerIds { get; set; }
    public bool? Enabled { get; set; }
}

public class UpdateTaskEndpoint : Endpoint<UpdateTaskRequest, ScheduledTask>
{
    private readonly IScheduledTaskService _scheduledTaskService;
    private readonly ILogger<UpdateTaskEndpoint> _logger;

    public UpdateTaskEndpoint(
        IScheduledTaskService scheduledTaskService,
        ILogger<UpdateTaskEndpoint> logger)
    {
        _scheduledTaskService = scheduledTaskService;
        _logger = logger;
    }

    public override void Configure()
    {
        Put("/api/scheduledtasks/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(UpdateTaskRequest req, CancellationToken ct)
    {
        try
        {
            var updateRequest = new UpdateScheduledTaskRequest
            {
                Name = req.Name,
                Description = req.Description,
                Command = req.Command,
                CronExpression = req.CronExpression,
                TimeZone = req.TimeZone,
                ServerIds = req.ServerIds
            };

            var task = await _scheduledTaskService.UpdateTaskAsync(req.Id, updateRequest);
            if (task == null)
            {
                await Send.NotFoundAsync(ct);
            return;
            }

            await Send.OkAsync(task, ct);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid request to update scheduled task {TaskId}", req.Id);
            HttpContext.Response.StatusCode = 400;
            await HttpContext.Response.WriteAsync($@"{{""error"":""{ex.Message.Replace("\"", "\\\"")}""}}", ct);
            return;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating scheduled task {TaskId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
