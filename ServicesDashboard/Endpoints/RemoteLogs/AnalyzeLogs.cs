using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Results;
using ServicesDashboard.Services.ArtificialIntelligence;
using ServicesDashboard.Services.LogCollection;

namespace ServicesDashboard.Endpoints.RemoteLogs;

public class AnalyzeLogsRequest
{
    public string ServerId { get; set; } = string.Empty;
    public string ContainerId { get; set; } = string.Empty;
}

public class AnalyzeLogsEndpoint : Endpoint<AnalyzeLogsRequest, LogAnalysisResult>
{
    private readonly IRemoteLogCollector _logCollector;
    private readonly ILogAnalyzer _logAnalyzer;
    private readonly ILogger<AnalyzeLogsEndpoint> _logger;

    public AnalyzeLogsEndpoint(
        IRemoteLogCollector logCollector,
        ILogAnalyzer logAnalyzer,
        ILogger<AnalyzeLogsEndpoint> logger)
    {
        _logCollector = logCollector;
        _logAnalyzer = logAnalyzer;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/remotelogs/servers/{serverId}/containers/{containerId}/analyze");
        AllowAnonymous();
    }

    public override async Task HandleAsync(AnalyzeLogsRequest req, CancellationToken ct)
    {
        try
        {
            var logs = await _logCollector.GetContainerLogsAsync(req.ServerId, req.ContainerId, 1000); // Get last 1000 lines for analysis
            var analysisResult = await _logAnalyzer.AnalyzeLogsAsync(logs);

            await Send.OkAsync(new LogAnalysisResult
            {
                ServiceId = req.ContainerId,
                Issues = analysisResult.Issues.Select(i => new LogIssue
                {
                    Severity = i.Severity,
                    Description = i.Description,
                    Suggestion = i.Suggestion
                }),
                Summary = analysisResult.Summary,
                Timestamp = DateTimeOffset.UtcNow
            }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error analyzing logs for container {ContainerId} on server {ServerId}", req.ContainerId, req.ServerId);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync($@"{{""error"":""Failed to analyze logs: {ex.Message.Replace("\"", "\\\"")}""}}", ct);
            return;
        }
    }
}
