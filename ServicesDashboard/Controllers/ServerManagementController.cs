using Microsoft.AspNetCore.Mvc;
using ServicesDashboard.Services.ServerManagement;
using ServicesDashboard.Models.ServerManagement;

namespace ServicesDashboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServerManagementController : ControllerBase
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<ServerManagementController> _logger;

    public ServerManagementController(
        IServerManagementService serverManagementService,
        ILogger<ServerManagementController> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ManagedServer>>> GetServers()
    {
        try
        {
            var servers = await _serverManagementService.GetServersAsync();
            return Ok(servers);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting servers");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ManagedServer>> GetServer(int id)
    {
        try
        {
            var server = await _serverManagementService.GetServerAsync(id);
            if (server == null)
                return NotFound();

            return Ok(server);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting server {ServerId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost]
    public async Task<ActionResult<ManagedServer>> AddServer(ManagedServer server)
    {
        try
        {
            var addedServer = await _serverManagementService.AddServerAsync(server);
            return CreatedAtAction(nameof(GetServer), new { id = addedServer.Id }, addedServer);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding server");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ManagedServer>> UpdateServer(int id, ManagedServer server)
    {
        if (id != server.Id)
            return BadRequest("Server ID mismatch");

        try
        {
            var updatedServer = await _serverManagementService.UpdateServerAsync(server);
            return Ok(updatedServer);
        }
        catch (ArgumentException)
        {
            return NotFound();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating server {ServerId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteServer(int id)
    {
        try
        {
            var deleted = await _serverManagementService.DeleteServerAsync(id);
            if (!deleted)
                return NotFound();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting server {ServerId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("{id}/health-check")]
    public async Task<ActionResult<ServerHealthCheck>> PerformHealthCheck(int id)
    {
        try
        {
            var healthCheck = await _serverManagementService.PerformHealthCheckAsync(id);
            if (healthCheck == null)
                return NotFound();

            return Ok(healthCheck);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error performing health check for server {ServerId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("{id}/check-updates")]
    public async Task<ActionResult<UpdateReport>> CheckUpdates(int id)
    {
        try
        {
            var updateReport = await _serverManagementService.CheckForUpdatesAsync(id);
            if (updateReport == null)
                return NotFound();

            return Ok(updateReport);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking updates for server {ServerId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("{id}/test-connection")]
    public async Task<ActionResult<bool>> TestConnection(int id)
    {
        try
        {
            var server = await _serverManagementService.GetServerAsync(id);
            if (server == null)
                return NotFound();

            var canConnect = await _serverManagementService.TestConnectionAsync(server);
            return Ok(canConnect);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing connection for server {ServerId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("alerts")]
    public async Task<ActionResult<IEnumerable<ServerAlert>>> GetAlerts([FromQuery] int? serverId = null)
    {
        try
        {
            var alerts = await _serverManagementService.GetActiveAlertsAsync(serverId);
            return Ok(alerts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting alerts");
            return StatusCode(500, "Internal server error");
        }
    }
}
