using Microsoft.AspNetCore.Mvc;
using ServicesDashboard.Services.NetworkDiscovery;
using ServicesDashboard.Services;
using ServicesDashboard.Models;

namespace ServicesDashboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NetworkDiscoveryController : ControllerBase
{
    private readonly INetworkDiscoveryService _networkDiscoveryService;
    private readonly IServiceManager _serviceManager;
    private readonly ILogger<NetworkDiscoveryController> _logger;

    // Default common ports to scan
    private readonly int[] _defaultPorts = { 21, 22, 80, 443, 8080, 8443, 3306, 5432, 6379, 9200, 27017 };

    public NetworkDiscoveryController(
        INetworkDiscoveryService networkDiscoveryService, 
        IServiceManager serviceManager,
        ILogger<NetworkDiscoveryController> logger)
    {
        _networkDiscoveryService = networkDiscoveryService;
        _serviceManager = serviceManager;
        _logger = logger;
    }

    [HttpPost("scan-network")]
    public async Task<ActionResult<IEnumerable<DiscoveredService>>> ScanNetwork([FromBody] NetworkScanRequest request, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Starting network scan for {NetworkRange}", request.NetworkRange);
            
            var ports = request.Ports?.Length > 0 ? request.Ports : _defaultPorts;
            var services = await _networkDiscoveryService.ScanNetworkAsync(request.NetworkRange, ports, cancellationToken);
            
            return Ok(services);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during network scan");
            return BadRequest($"Network scan failed: {ex.Message}");
        }
    }

    [HttpPost("scan-host")]
    public async Task<ActionResult<IEnumerable<DiscoveredService>>> ScanHost([FromBody] HostScanRequest request, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Starting host scan for {HostAddress}", request.HostAddress);
            
            var ports = request.Ports?.Length > 0 ? request.Ports : _defaultPorts;
            var services = await _networkDiscoveryService.ScanHostAsync(request.HostAddress, ports, cancellationToken);
            
            return Ok(services);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during host scan");
            return BadRequest($"Host scan failed: {ex.Message}");
        }
    }

    [HttpPost("add-to-services")]
    public async Task<ActionResult<HostedService>> AddDiscoveredServiceToServices([FromBody] AddDiscoveredServiceRequest request)
    {
        try
        {
            _logger.LogInformation("Adding discovered service {ServiceName} to services", request.Name);

            var service = new HostedService
            {
                Name = request.Name,
                Description = request.Description ?? $"Discovered {request.ServiceType} service on {request.HostAddress}:{request.Port}",
                Url = GenerateServiceUrl(request.HostAddress, request.Port, request.ServiceType),
                ContainerId = string.Empty,
                IsDockerContainer = false,
                Status = "Discovered"
            };

            var addedService = await _serviceManager.AddServiceAsync(service);
            return CreatedAtAction(nameof(GetService), new { id = addedService.Id }, addedService);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding discovered service to services");
            return BadRequest($"Failed to add service: {ex.Message}");
        }
    }

    [HttpGet("services/{id}")]
    public async Task<ActionResult<HostedService>> GetService(Guid id)
    {
        var service = await _serviceManager.GetServiceByIdAsync(id);
        if (service == null)
        {
            return NotFound();
        }
        return Ok(service);
    }

    [HttpGet("common-ports")]
    public ActionResult<int[]> GetCommonPorts()
    {
        return Ok(_defaultPorts);
    }

    private string GenerateServiceUrl(string hostAddress, int port, string serviceType)
    {
        return serviceType.ToLower() switch
        {
            "http" => $"http://{hostAddress}:{port}",
            "https" => $"https://{hostAddress}:{port}",
            "http alt" => $"http://{hostAddress}:{port}",
            "https alt" => $"https://{hostAddress}:{port}",
            _ => $"http://{hostAddress}:{port}"
        };
    }
}

public class NetworkScanRequest
{
    public string NetworkRange { get; set; } = string.Empty;
    public int[]? Ports { get; set; }
}

public class HostScanRequest
{
    public string HostAddress { get; set; } = string.Empty;
    public int[]? Ports { get; set; }
}

public class AddDiscoveredServiceRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string HostAddress { get; set; } = string.Empty;
    public int Port { get; set; }
    public string ServiceType { get; set; } = string.Empty;
    public string? Banner { get; set; }
}