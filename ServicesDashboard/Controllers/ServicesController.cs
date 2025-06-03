using Microsoft.AspNetCore.Mvc;
using ServicesDashboard.Models;
using ServicesDashboard.Services.ServiceManagement;

namespace ServicesDashboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServicesController : ControllerBase
{
    private readonly IServiceManager _serviceManager;
    private readonly ILogger<ServicesController> _logger;

    public ServicesController(IServiceManager serviceManager, ILogger<ServicesController> logger)
    {
        _serviceManager = serviceManager;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<HostedService>>> GetAllServices()
    {
        var services = await _serviceManager.GetAllServicesAsync();
        return Ok(services);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<HostedService>> GetService(Guid id)
    {
        var service = await _serviceManager.GetServiceByIdAsync(id);
        if (service == null)
            return NotFound();

        return Ok(service);
    }

    [HttpPost]
    public async Task<ActionResult<HostedService>> CreateService(HostedService service)
    {
        var createdService = await _serviceManager.AddServiceAsync(service);
        return CreatedAtAction(nameof(GetService), new { id = createdService.Id }, createdService);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateService(Guid id, HostedService service)
    {
        if (id != service.Id)
            return BadRequest();

        var success = await _serviceManager.UpdateServiceAsync(service);
        if (!success)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteService(Guid id)
    {
        var success = await _serviceManager.DeleteServiceAsync(id);
        if (!success)
            return NotFound();

        return NoContent();
    }

    [HttpPost("{id}/check-health")]
    public async Task<IActionResult> CheckServiceHealth(Guid id)
    {
        var success = await _serviceManager.CheckServiceHealthAsync(id);
        if (!success)
            return NotFound();

        return NoContent();
    }
}