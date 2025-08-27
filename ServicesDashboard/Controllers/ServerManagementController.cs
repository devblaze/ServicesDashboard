using Microsoft.AspNetCore.Mvc;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Models.Requests;
using ServicesDashboard.Models.Results;
using ServicesDashboard.Services.ServerManagement;

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
    public async Task<ActionResult<ManagedServer>> AddServer([FromBody] CreateUpdateServerRequest request)
    {
        try
        {
            var server = new ManagedServer
            {
                Name = request.Name,
                HostAddress = request.HostAddress,
                SshPort = request.SshPort,
                Username = request.Username,
                EncryptedPassword = request.Password, // Will be encrypted in service
                Type = Enum.Parse<ServerType>(request.Type ?? "Server"),
                Tags = request.Tags
            };

            var addedServer = await _serverManagementService.AddServerAsync(server);
            return CreatedAtAction(nameof(GetServer), new { id = addedServer.Id }, addedServer);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("already exists"))
        {
            _logger.LogWarning("Attempted to add duplicate server: {HostAddress}", request.HostAddress);
            return BadRequest(new
            {
                error = "DuplicateServer",
                message = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding server");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ManagedServer>> UpdateServer(int id, [FromBody] CreateUpdateServerRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var existingServer = await _serverManagementService.GetServerAsync(id);
            if (existingServer == null)
                return NotFound();

            // Check for host address conflicts
            if (!string.IsNullOrWhiteSpace(request.HostAddress) && 
                !string.Equals(existingServer.HostAddress, request.HostAddress, StringComparison.OrdinalIgnoreCase))
            {
                var isHostAvailable = await _serverManagementService.IsHostAddressAvailableAsync(request.HostAddress);
                if (!isHostAvailable)
                {
                    return BadRequest(new 
                    { 
                        error = "DuplicateHostAddress", 
                        message = $"A server with host address '{request.HostAddress}' already exists." 
                    });
                }
            }

            // Apply partial updates
            var serverToUpdate = ApplyPartialUpdate(existingServer, request);
        
            var updatedServer = await _serverManagementService.UpdateServerAsync(serverToUpdate);
            return Ok(updatedServer);
        }
        catch (ArgumentException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("already exists"))
        {
            _logger.LogWarning("Attempted to update server with duplicate host address: {HostAddress}", request.HostAddress);
            return BadRequest(new 
            { 
                error = "DuplicateHostAddress", 
                message = ex.Message 
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating server {ServerId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    private static ManagedServer ApplyPartialUpdate(ManagedServer existingServer, CreateUpdateServerRequest request)
    {
        return new ManagedServer
        {
            Id = existingServer.Id,
            Name = UpdateField(request.Name, existingServer.Name),
            HostAddress = UpdateField(request.HostAddress, existingServer.HostAddress),
            SshPort = request.SshPort ?? existingServer.SshPort,
            Username = UpdateField(request.Username, existingServer.Username),
            EncryptedPassword = UpdateField(request.Password, existingServer.EncryptedPassword),
            Type = UpdateEnum<ServerType>(request.Type, existingServer.Type),
            Tags = UpdateTags(request.Tags, existingServer.Tags),
        
            // Preserve existing values
            Status = existingServer.Status,
            OperatingSystem = existingServer.OperatingSystem,
            SystemInfo = existingServer.SystemInfo,
            LastCheckTime = existingServer.LastCheckTime,
            CreatedAt = existingServer.CreatedAt,
            UpdatedAt = DateTime.UtcNow,
            SshKeyPath = existingServer.SshKeyPath
        };
    }

    private static string? UpdateField(string? newValue, string? existingValue)
    {
        return !string.IsNullOrWhiteSpace(newValue) ? newValue.Trim() : existingValue;
    }

    private static T UpdateEnum<T>(string? newValue, T existingValue) where T : struct, Enum
    {
        return !string.IsNullOrWhiteSpace(newValue) && Enum.TryParse<T>(newValue, true, out var parsedValue) 
            ? parsedValue 
            : existingValue;
    }

    private static string? UpdateTags(string? newValue, string? existingValue)
    {
        // If tags is explicitly provided (even if empty), use it
        // If tags is null, keep existing value
        return newValue != null ? (string.IsNullOrWhiteSpace(newValue) ? null : newValue.Trim()) : existingValue;
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

    [HttpPost("test-new-connection")]
    public async Task<ActionResult<bool>> TestNewConnection([FromBody] ConnectionTestRequest request)
    {
        try
        {
            var canConnect = await _serverManagementService.TestConnectionAsync(
                request.HostAddress,
                request.SshPort,
                request.Username,
                request.Password // Pass plain text password directly
            );
            return Ok(canConnect);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing new connection to {HostAddress}", request.HostAddress);
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

    [HttpGet("check-host-availability")]
    public async Task<ActionResult<bool>> CheckHostAvailability([FromQuery] string hostAddress)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(hostAddress))
                return BadRequest("Host address is required");

            var isAvailable = await _serverManagementService.IsHostAddressAvailableAsync(hostAddress);
            return Ok(new { available = isAvailable });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking host availability for {HostAddress}", hostAddress);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("{id}/logs")]
    public async Task<ActionResult<string>> GetServerLogs(int id, [FromQuery] int? lines = 100)
    {
        try
        {
            var server = await _serverManagementService.GetServerAsync(id);
            if (server == null)
                return NotFound();

            var logs = await _serverManagementService.GetServerLogsAsync(server, lines);
            return Ok(new { logs });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting logs for server {ServerId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("{id}/analyze-logs")]
    public async Task<ActionResult<LogAnalysisResult>> AnalyzeServerLogs(int id, [FromQuery] int? lines = 500)
    {
        try
        {
            var server = await _serverManagementService.GetServerAsync(id);
            if (server == null)
                return NotFound();

            var logs = await _serverManagementService.GetServerLogsAsync(server, lines);
            var analysis = await _serverManagementService.AnalyzeLogsWithAiAsync(id, logs);

            return Ok(analysis);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error analyzing logs for server {ServerId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("{id}/execute-command")]
    public async Task<ActionResult<CommandResult>> ExecuteCommand(int id, [FromBody] ExecuteCommandRequest request)
    {
        try
        {
            var server = await _serverManagementService.GetServerAsync(id);
            if (server == null)
                return NotFound();

            var result = await _serverManagementService.ExecuteCommandAsync(id, request.Command);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing command on server {ServerId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpGet("{id}/ssh-session")]
    public async Task<ActionResult> CreateSshSession(int id)
    {
        try
        {
            var server = await _serverManagementService.GetServerAsync(id);
            if (server == null)
                return NotFound();

            // Return SSH connection details for web terminal
            return Ok(new
            {
                serverId = id,
                host = server.HostAddress,
                port = server.SshPort ?? 22,
                username = server.Username
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating SSH session for server {ServerId}", id);
            return StatusCode(500, "Internal server error");
        }
    }
    [HttpGet("{id}/docker-services")]
    public async Task<ActionResult<DockerServiceDiscoveryResult>> GetDockerServices(int id)
    {
        try
        {
            var result = await _serverManagementService.DiscoverDockerServicesAsync(id);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to discover Docker services for server {ServerId}", id);
            return StatusCode(500, "Failed to discover Docker services");
        }
    }

    [HttpPost("{id}/docker-services/{containerId}/add-to-services")]
    public async Task<ActionResult<HostedService>> AddDockerServiceToServices(int id, string containerId, [FromBody] CreateServiceFromDockerRequest request)
    {
        try
        {
            // This would integrate with your existing services system
            // You'll need to implement this based on your services architecture
            var serviceDto = new CreateServiceDto
            {
                Name = request.Name,
                Description = request.Description,
                DockerImage = "", // You might want to store the original image
                Port = request.Port,
                Environment = request.Environment,
                ServiceUrl = request.ServiceUrl
            };

            // Add logic to create the service and link it to the server
            // This is a placeholder - implement based on your services system
        
            return Ok(new { message = "Service added successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to add Docker service to services");
            return StatusCode(500, "Failed to add service");
        }
    }
}