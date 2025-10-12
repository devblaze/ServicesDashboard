using FastEndpoints;
using ServicesDashboard.Services.Tasks;

namespace ServicesDashboard.Endpoints.ScheduledTasks;

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

public class ValidateCronExpressionEndpoint : Endpoint<CronValidationRequest, CronValidationResponse>
{
    private readonly IScheduledTaskService _scheduledTaskService;
    private readonly ILogger<ValidateCronExpressionEndpoint> _logger;

    public ValidateCronExpressionEndpoint(
        IScheduledTaskService scheduledTaskService,
        ILogger<ValidateCronExpressionEndpoint> logger)
    {
        _scheduledTaskService = scheduledTaskService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/scheduledtasks/validate-cron");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CronValidationRequest req, CancellationToken ct)
    {
        try
        {
            var isValid = await _scheduledTaskService.ValidateCronExpression(req.CronExpression);
            DateTime? nextExecution = null;

            if (isValid)
            {
                nextExecution = _scheduledTaskService.GetNextExecutionTime(
                    req.CronExpression,
                    req.TimeZone ?? "UTC");
            }

            await Send.OkAsync(new CronValidationResponse
            {
                IsValid = isValid,
                NextExecution = nextExecution
            }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating cron expression");
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
