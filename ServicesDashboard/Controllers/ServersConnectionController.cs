// ServicesDashboard/Controllers/ServersController.cs
using Microsoft.AspNetCore.Mvc;
using ServicesDashboard.Models;
using ServicesDashboard.Services.ServerConnection;

namespace ServicesDashboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServersController : ControllerBase
{
    private readonly IServerConnectionManager _connectionManager;
    private readonly ILogger<ServersController> _logger;

    public ServersController(
        IServerConnectionManager connectionManager,
        ILogger<ServersController> logger)
    {
        _connectionManager = connectionManager;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ServerConnection>>> GetAllConnections()
    {
        var connections = await _connectionManager.GetAllConnectionsAsync();
        return Ok(connections);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ServerConnection>> GetConnection(string id)
    {
        var connection = await _connectionManager.GetConnectionByIdAsync(id);
        if (connection == null)
        {
            return NotFound();
        }
        
        return Ok(connection);
    }

    [HttpPost]
    public async Task<ActionResult<ServerConnection>> AddConnection([FromBody] ServerConnectionDto connectionDto)
    {
        var connection = await _connectionManager.AddConnectionAsync(connectionDto);
        return CreatedAtAction(nameof(GetConnection), new { id = connection.Id }, connection);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ServerConnection>> UpdateConnection(string id, [FromBody] ServerConnectionDto connectionDto)
    {
        var connection = await _connectionManager.UpdateConnectionAsync(id, connectionDto);
        if (connection == null)
        {
            return NotFound();
        }
        
        return Ok(connection);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteConnection(string id)
    {
        var result = await _connectionManager.DeleteConnectionAsync(id);
        if (!result)
        {
            return NotFound();
        }
        
        return NoContent();
    }

    [HttpPost("{id}/test")]
    public async Task<ActionResult<bool>> TestConnection(string id)
    {
        var result = await _connectionManager.TestConnectionAsync(id);
        return Ok(result);
    }

    [HttpPost("test")]
    public async Task<ActionResult<bool>> TestNewConnection([FromBody] ServerConnectionDto connectionDto)
    {
        var result = await _connectionManager.TestConnectionAsync(connectionDto);
        return Ok(result);
    }
}