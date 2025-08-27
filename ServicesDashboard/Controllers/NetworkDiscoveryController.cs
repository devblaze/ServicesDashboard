using Microsoft.AspNetCore.Mvc;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Models.Requests;
using ServicesDashboard.Services;
using ServicesDashboard.Services.NetworkDiscovery;

namespace ServicesDashboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NetworkDiscoveryController : ControllerBase
{
    private readonly INetworkDiscoveryService _networkDiscoveryService;
    private readonly IUserServices _userServices;
    private readonly ILogger<NetworkDiscoveryController> _logger;

    public NetworkDiscoveryController(
        INetworkDiscoveryService networkDiscoveryService,
        IUserServices userServices,
        ILogger<NetworkDiscoveryController> logger)
    {
        _networkDiscoveryService = networkDiscoveryService;
        _userServices = userServices;
        _logger = logger;
    }

    [HttpGet("common-ports")]
    public ActionResult<int[]> GetCommonPorts()
    {
        var commonPorts = new[] { 21, 22, 23, 25, 53, 80, 110, 143, 443, 993, 995, 3306, 3389, 5432, 5900, 6379, 27017 };
        return Ok(commonPorts);
    }

    [HttpPost("scan-network")]
    public async Task<ActionResult<IEnumerable<DiscoveredService>>> ScanNetwork([FromBody] NetworkScanRequest request)
    {
        try
        {
            _logger.LogInformation("Starting network scan for {NetworkRange}", request.NetworkRange);
            
            var ports = request.Ports?.Length > 0 ? request.Ports : GetCommonPorts().Value ?? Array.Empty<int>();
            var services = await _networkDiscoveryService.ScanNetworkAsync(request.NetworkRange, ports, CancellationToken.None);
            
            _logger.LogInformation("Network scan completed. Found {ServiceCount} services", services.Count());
            return Ok(services);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during network scan for {NetworkRange}", request.NetworkRange);
            return StatusCode(500, "Error during network scan");
        }
    }

    [HttpPost("scan-host")]
    public async Task<ActionResult<IEnumerable<DiscoveredService>>> ScanHost([FromBody] HostScanRequest request)
    {
        try
        {
            _logger.LogInformation("Starting host scan for {HostAddress}", request.HostAddress);
            
            var ports = request.Ports?.Length > 0 ? request.Ports : GetCommonPorts().Value ?? Array.Empty<int>();
            var services = await _networkDiscoveryService.ScanHostAsync(request.HostAddress, ports, CancellationToken.None);
            
            _logger.LogInformation("Host scan completed. Found {ServiceCount} services", services.Count());
            return Ok(services);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during host scan for {HostAddress}", request.HostAddress);
            return StatusCode(500, "Error during host scan");
        }
    }

    [HttpPost("add-to-services")]
    public async Task<ActionResult<HostedService>> AddDiscoveredServiceToServices([FromBody] AddDiscoveredServiceRequest request)
    {
        try
        {
            _logger.LogInformation("Adding discovered service: {Name} at {HostAddress}:{Port}", 
                request.Name, request.HostAddress, request.Port);

            // Validate the request
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest("Service name is required");
            }

            if (string.IsNullOrWhiteSpace(request.HostAddress))
            {
                return BadRequest("Host address is required");
            }

            if (request.Port <= 0 || request.Port > 65535)
            {
                return BadRequest("Invalid port number");
            }

            // Create the service URL
            var protocol = request.ServiceType?.ToLower() switch
            {
                "https" => "https",
                "http" => "http",
                var type when type?.Contains("ssl") == true => "https",
                var type when type?.Contains("tls") == true => "https",
                _ => request.Port == 443 ? "https" : "http"
            };

            var serviceUrl = $"{protocol}://{request.HostAddress}:{request.Port}";

            // Create the HostedService object directly
            var hostedService = new HostedService
            {
                Name = request.Name,
                Description = request.Description,
                Url = serviceUrl,
                IsDockerContainer = false, // Discovered services are not Docker containers
                LastChecked = DateTime.UtcNow
            };

            _logger.LogInformation("Creating service with URL: {Url}", serviceUrl);

            var createdService = await _userServices.AddServiceAsync(hostedService);
            
            _logger.LogInformation("Successfully added service: {ServiceId}", createdService.Id);
            return Ok(createdService);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding discovered service: {Name} at {HostAddress}:{Port}", 
                request.Name, request.HostAddress, request.Port);
            
            // Return more specific error information
            if (ex.InnerException != null)
            {
                return BadRequest($"Database error: {ex.InnerException.Message}");
            }
            
            return StatusCode(500, $"Error adding service: {ex.Message}");
        }
    }
}