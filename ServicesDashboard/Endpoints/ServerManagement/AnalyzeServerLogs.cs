using FastEndpoints;
using ServicesDashboard.Models.Results;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class AnalyzeServerLogsRequest
{
    public int Id { get; set; }
    public int? Lines { get; set; } = 500;
}

public class AnalyzeServerLogsEndpoint : Endpoint<AnalyzeServerLogsRequest, LogAnalysisResult>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<AnalyzeServerLogsEndpoint> _logger;

    public AnalyzeServerLogsEndpoint(
        IServerManagementService serverManagementService,
        ILogger<AnalyzeServerLogsEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/servermanagement/{id}/analyze-logs");
        AllowAnonymous();
    }

    public override async Task HandleAsync(AnalyzeServerLogsRequest req, CancellationToken ct)
    {
        try
        {
            var server = await _serverManagementService.GetServerAsync(req.Id);
            if (server == null)
            {
                await Send.NotFoundAsync(ct);
            return;
            }

            var logs = await _serverManagementService.GetServerLogsAsync(server, req.Lines);
            var analysis = await _serverManagementService.AnalyzeLogsWithAiAsync(req.Id, logs);

            await Send.OkAsync(analysis, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error analyzing logs for server {ServerId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
