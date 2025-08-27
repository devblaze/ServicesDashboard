using Microsoft.AspNetCore.Mvc;
using ServicesDashboard.Models;
using ServicesDashboard.Services;

namespace ServicesDashboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServicesController : ControllerBase
{
    private readonly IUserServices _userServices;
    private readonly ILogger<ServicesController> _logger;

    public ServicesController(IUserServices userServices, ILogger<ServicesController> logger)
    {
        _userServices = userServices;
        _logger = logger;
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
}