using Microsoft.AspNetCore.Mvc;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Results;
using ServicesDashboard.Services;
using ServicesDashboard.Services.LogCollection;

namespace ServicesDashboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LogsController : ControllerBase
{
    private readonly IDockerLogCollector _dockerLogCollector;
    private readonly ILogAnalyzer _logAnalyzer;
    private readonly ILogger<LogsController> _logger;

    public LogsController(
        IDockerLogCollector dockerLogCollector, 
        ILogAnalyzer logAnalyzer, 
        ILogger<LogsController> logger)
    {
        _dockerLogCollector = dockerLogCollector;
        _logAnalyzer = logAnalyzer;
        _logger = logger;
    }

    [HttpGet("containers")]
    public async Task<ActionResult<IEnumerable<string>>> GetContainers()
    {
        var containers = await _dockerLogCollector.ListContainersAsync();
        return Ok(containers);
    }

    [HttpGet("containers/{containerId}")]
    public async Task<ActionResult<string>> GetContainerLogs(string containerId, [FromQuery] int lines = 100)
    {
        var logs = await _dockerLogCollector.GetContainerLogsAsync(containerId, lines);
        return Ok(logs);
    }

    [HttpGet("containers/{containerId}/download")]
    public async Task<ActionResult> DownloadContainerLogs(string containerId)
    {
        var logs = await _dockerLogCollector.DownloadContainerLogsAsync(containerId);
        return File(System.Text.Encoding.UTF8.GetBytes(logs), "text/plain", $"{containerId}-logs.txt");
    }

    [HttpPost("analyze")]
    public async Task<ActionResult<LogAnalysisResult>> AnalyzeLogs([FromBody] string logs)
    {
        var result = await _logAnalyzer.AnalyzeLogsAsync(logs);
        return Ok(result);
    }
}