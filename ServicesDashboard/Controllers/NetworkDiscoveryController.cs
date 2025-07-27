using Microsoft.AspNetCore.Mvc;
using ServicesDashboard.Services;
using ServicesDashboard.Services.NetworkDiscovery;

namespace ServicesDashboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NetworkDiscoveryController : ControllerBase
{
    private readonly INetworkDiscoveryService _networkDiscoveryService;
    private readonly ILogger<NetworkDiscoveryController> _logger;

    // Default common ports to scan
    private readonly int[] _defaultPorts = { 21, 22, 80, 443, 8080, 8443, 3306, 5432, 6379, 9200, 27017 };

    public NetworkDiscoveryController(INetworkDiscoveryService networkDiscoveryService, ILogger<NetworkDiscoveryController> logger)
    {
        _networkDiscoveryService = networkDiscoveryService;
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

    [HttpGet("common-ports")]
    public ActionResult<int[]> GetCommonPorts()
    {
        return Ok(_defaultPorts);
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
