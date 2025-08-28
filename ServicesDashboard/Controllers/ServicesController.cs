using Microsoft.AspNetCore.Mvc;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServicesController : ControllerBase
{
    private readonly IUserServices _userServices;
    private readonly ILogger<ServicesController> _logger;
    private readonly IServerManagementService _serverManagementService;

    public ServicesController(IUserServices userServices, ILogger<ServicesController> logger, IServerManagementService serverManagementService)
    {
        _userServices = userServices;
        _logger = logger;
        _serverManagementService = serverManagementService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<HostedService>>> GetAllServices()
    {
        var services = await _userServices.GetAllServicesAsync();
        return Ok(services);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<HostedService>> GetService(Guid id)
    {
        var service = await _userServices.GetServiceByIdAsync(id);
        if (service == null)
            return NotFound();

        return Ok(service);
    }

    [HttpPost]
    public async Task<ActionResult<HostedService>> CreateService(HostedService service)
    {
        var createdService = await _userServices.AddServiceAsync(service);
        return CreatedAtAction(nameof(GetService), new { id = createdService.Id }, createdService);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateService(Guid id, HostedService service)
    {
        if (id != service.Id)
            return BadRequest();

        var success = await _userServices.UpdateServiceAsync(service);
        if (!success)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteService(Guid id)
    {
        var success = await _userServices.DeleteServiceAsync(id);
        if (!success)
            return NotFound();

        return NoContent();
    }

    [HttpPost("{id}/check-health")]
    public async Task<IActionResult> CheckServiceHealth(Guid id)
    {
        var success = await _userServices.CheckServiceHealthAsync(id);
        if (!success)
            return NotFound();

        return NoContent();
    }
    
    [HttpGet("servers")]
    public async Task<ActionResult<IEnumerable<ServerSummaryDto>>> GetServersForServices()
    {
        try
        {
            var servers = await _serverManagementService.GetServersAsync();
            var serverSummaries = servers.Select(s => new ServerSummaryDto
            {
                Id = s.Id,
                Name = s.Name,
                HostAddress = s.HostAddress,
                Status = s.Status.ToString(),
                Type = s.Type.ToString(),
                LastCheckTime = s.LastCheckTime
            }).ToList();

            return Ok(serverSummaries);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get servers for services");
            return StatusCode(500, "Failed to retrieve servers");
        }
    }
}