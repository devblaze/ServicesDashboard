using Microsoft.AspNetCore.Mvc;
using ServicesDashboard.Services;
using ServicesDashboard.Services.LogCollection;
using ServicesDashboard.Services.AIAnalysis;

namespace ServicesDashboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RemoteLogsController : ControllerBase
{
    private readonly IRemoteLogCollector _logCollector;
    private readonly ILogAnalyzer _logAnalyzer;
    private readonly ILogger<RemoteLogsController> _logger;

    public RemoteLogsController(
        IRemoteLogCollector logCollector,
        ILogAnalyzer logAnalyzer,
        ILogger<RemoteLogsController> logger)
    {
        _logCollector = logCollector;
        _logAnalyzer = logAnalyzer;
        _logger = logger;
    }

    [HttpGet("servers/{serverId}/containers")]
    public async Task<ActionResult<IEnumerable<RemoteContainer>>> GetContainers(string serverId)
    {
        try
        {
            var containers = await _logCollector.ListContainersAsync(serverId);
            return Ok(containers);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting containers for server {ServerId}", serverId);
            return StatusCode(500, "Failed to get containers: " + ex.Message);
        }
    }

    [HttpGet("servers/{serverId}/containers/{containerId}/logs")]
    public async Task<ActionResult<string>> GetContainerLogs(string serverId, string containerId, [FromQuery] int lines = 100)
    {
        try
        {
            var logs = await _logCollector.GetContainerLogsAsync(serverId, containerId, lines);
            return Ok(logs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting logs for container {ContainerId} on server {ServerId}", containerId, serverId);
            return StatusCode(500, "Failed to get container logs: " + ex.Message);
        }
    }

    [HttpGet("servers/{serverId}/containers/{containerId}/download")]
    public async Task<ActionResult> DownloadContainerLogs(string serverId, string containerId)
    {
        try
        {
            var logs = await _logCollector.DownloadContainerLogsAsync(serverId, containerId);
            return File(System.Text.Encoding.UTF8.GetBytes(logs), "text/plain", $"{containerId}-logs.txt");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error downloading logs for container {ContainerId} on server {ServerId}", containerId, serverId);
            return StatusCode(500, "Failed to download container logs: " + ex.Message);
        }
    }

    [HttpGet("servers/{serverId}/containers/{containerId}/stats")]
    public async Task<ActionResult<ContainerStats>> GetContainerStats(string serverId, string containerId)
    {
        try
        {
            var stats = await _logCollector.GetContainerStatsAsync(serverId, containerId);
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting stats for container {ContainerId} on server {ServerId}", containerId, serverId);
            return StatusCode(500, "Failed to get container stats: " + ex.Message);
        }
    }

    [HttpPost("servers/{serverId}/containers/{containerId}/restart")]
    public async Task<ActionResult<bool>> RestartContainer(string serverId, string containerId)
    {
        try
        {
            var result = await _logCollector.RestartContainerAsync(serverId, containerId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error restarting container {ContainerId} on server {ServerId}", containerId, serverId);
            return StatusCode(500, "Failed to restart container: " + ex.Message);
        }
    }

    [HttpPost("servers/{serverId}/containers/{containerId}/stop")]
    public async Task<ActionResult<bool>> StopContainer(string serverId, string containerId)
    {
        try
        {
            var result = await _logCollector.StopContainerAsync(serverId, containerId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error stopping container {ContainerId} on server {ServerId}", containerId, serverId);
            return StatusCode(500, "Failed to stop container: " + ex.Message);
        }
    }

    [HttpPost("servers/{serverId}/containers/{containerId}/start")]
    public async Task<ActionResult<bool>> StartContainer(string serverId, string containerId)
    {
        try
        {
            var result = await _logCollector.StartContainerAsync(serverId, containerId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting container {ContainerId} on server {ServerId}", containerId, serverId);
            return StatusCode(500, "Failed to start container: " + ex.Message);
        }
    }

    [HttpPost("servers/{serverId}/containers/{containerId}/analyze")]
    public async Task<ActionResult<Models.LogAnalysisResult>> AnalyzeLogs(string serverId, string containerId)
    {
        try
        {
            var logs = await _logCollector.GetContainerLogsAsync(serverId, containerId, 1000); // Get last 1000 lines for analysis
            var analysisResult = await _logAnalyzer.AnalyzeLogsAsync(logs);
            
            return Ok(new Models.LogAnalysisResult
            {
                ServiceId = containerId,
                Issues = analysisResult.Issues.Select(i => new Models.LogIssue
                {
                    Severity = i.Severity,
                    Description = i.Description,
                    Suggestion = i.Suggestion
                }),
                Summary = analysisResult.Summary,
                Timestamp = DateTimeOffset.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error analyzing logs for container {ContainerId} on server {ServerId}", containerId, serverId);
            return StatusCode(500, "Failed to analyze logs: " + ex.Message);
        }
    }
}