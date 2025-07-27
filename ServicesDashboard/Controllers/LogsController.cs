using Microsoft.AspNetCore.Mvc;
using ServicesDashboard.Services;
using ServicesDashboard.Services.LogCollection;
using ServicesDashboard.Services.AIAnalysis;

namespace ServicesDashboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LogsController : ControllerBase
{
    private readonly ILogCollector _logCollector;
    private readonly ILogAnalyzer _logAnalyzer;
    private readonly ILogger<LogsController> _logger;

    public LogsController(
        ILogCollector logCollector, 
        ILogAnalyzer logAnalyzer, 
        ILogger<LogsController> logger)
    {
        _logCollector = logCollector;
        _logAnalyzer = logAnalyzer;
        _logger = logger;
    }

    [HttpGet("containers")]
    public async Task<ActionResult<IEnumerable<string>>> GetContainers()
    {
        var containers = await _logCollector.ListContainersAsync();
        return Ok(containers);
    }

    [HttpGet("containers/{containerId}")]
    public async Task<ActionResult<string>> GetContainerLogs(string containerId, [FromQuery] int lines = 100)
    {
        var logs = await _logCollector.GetContainerLogsAsync(containerId, lines);
        return Ok(logs);
    }

    [HttpGet("containers/{containerId}/download")]
    public async Task<ActionResult> DownloadContainerLogs(string containerId)
    {
        var logs = await _logCollector.DownloadContainerLogsAsync(containerId);
        return File(System.Text.Encoding.UTF8.GetBytes(logs), "text/plain", $"{containerId}-logs.txt");
    }

    [HttpPost("analyze")]
    public async Task<ActionResult<LogAnalysisResult>> AnalyzeLogs([FromBody] string logs)
    {
        var result = await _logAnalyzer.AnalyzeLogsAsync(logs);
        return Ok(result);
    }
}