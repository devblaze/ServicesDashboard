using Microsoft.AspNetCore.Mvc;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Requests;
using ServicesDashboard.Models.Results;
using ServicesDashboard.Services;
using ServicesDashboard.Services.NetworkDiscovery;

namespace ServicesDashboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NetworkDiscoveryController : ControllerBase
{
    private readonly INetworkDiscoveryService _networkDiscoveryService;
    private readonly IBackgroundNetworkScanService _backgroundScanService;
    private readonly IUserServices _userServices;
    private readonly ILogger<NetworkDiscoveryController> _logger;

    public NetworkDiscoveryController(
        INetworkDiscoveryService networkDiscoveryService,
        IBackgroundNetworkScanService backgroundScanService,
        IUserServices userServices,
        ILogger<NetworkDiscoveryController> logger)
    {
        _networkDiscoveryService = networkDiscoveryService;
        _backgroundScanService = backgroundScanService;
        _userServices = userServices;
        _logger = logger;
    }

    [HttpGet("common-ports")]
    public ActionResult<int[]> GetCommonPorts()
    {
        return Ok(_networkDiscoveryService.GetCommonPorts());
    }

    [HttpGet("extended-ports")]
    public ActionResult<int[]> GetExtendedPorts()
    {
        return Ok(_networkDiscoveryService.GetExtendedPorts());
    }

    [HttpPost("start-scan")]
    public async Task<ActionResult<Guid>> StartScan([FromBody] StartScanRequest request)
    {
        try
        {
            _logger.LogInformation("Starting background scan for {Target} ({ScanType})", 
                request.Target, request.ScanType);

            var scanId = await _backgroundScanService.StartScanAsync(
                request.Target,
                request.ScanType,
                request.Ports,
                request.FullScan);

            return Ok(new { scanId, message = "Scan started successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting scan for {Target}", request.Target);
            return StatusCode(500, "Error starting scan");
        }
    }

    [HttpGet("scan-status/{scanId:guid}")]
    public async Task<ActionResult<object>> GetScanStatus(Guid scanId)
    {
        try
        {
            var scanSession = await _backgroundScanService.GetScanStatusAsync(scanId);
            if (scanSession == null)
            {
                return NotFound("Scan not found");
            }

            return Ok(new
            {
                scanId = scanSession.Id,
                target = scanSession.Target,
                scanType = scanSession.ScanType,
                status = scanSession.Status,
                startedAt = scanSession.StartedAt,
                completedAt = scanSession.CompletedAt,
                serviceCount = scanSession.DiscoveredServices.Count,
                errorMessage = scanSession.ErrorMessage
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting scan status for {ScanId}", scanId);
            return StatusCode(500, "Error getting scan status");
        }
    }

    [HttpGet("scan-results/{scanId:guid}")]
    public async Task<ActionResult<IEnumerable<StoredDiscoveredService>>> GetScanResults(Guid scanId)
    {
        try
        {
            var results = await _backgroundScanService.GetScanResultsAsync(scanId);
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting scan results for {ScanId}", scanId);
            return StatusCode(500, "Error getting scan results");
        }
    }

    [HttpGet("recent-scans")]
    public async Task<ActionResult<IEnumerable<NetworkScanSession>>> GetRecentScans([FromQuery] int limit = 10)
    {
        try
        {
            var scans = await _backgroundScanService.GetRecentScansAsync(limit);
            return Ok(scans);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recent scans");
            return StatusCode(500, "Error getting recent scans");
        }
    }

    [HttpGet("latest-results/{target}")]
    public async Task<ActionResult<IEnumerable<StoredDiscoveredService>>> GetLatestResults(string target)
    {
        try
        {
            var results = await _backgroundScanService.GetLatestDiscoveredServicesAsync(target);
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting latest results for {Target}", target);
            return StatusCode(500, "Error getting latest results");
        }
    }

    // Quick scan for immediate results (small scans only)
    [HttpPost("quick-scan")]
    public async Task<ActionResult<IEnumerable<DiscoveredServiceResult>>> QuickScan([FromBody] QuickScanRequest request)
    {
        try
        {
            _logger.LogInformation("Starting quick scan for {Target}", request.Target);
            
            // Use a shorter timeout for quick scans
            using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(2));
            
            var isNetwork = request.Target.Contains('/') || request.Target.Contains('-');
            
            IEnumerable<DiscoveredServiceResult> services;
            if (isNetwork)
            {
                // For network quick scans, limit to common ports only
                services = await _networkDiscoveryService.ScanNetworkAsync(
                    request.Target, 
                    ports: _networkDiscoveryService.GetCommonPorts(), 
                    fullScan: false,
                    cts.Token);
            }
            else
            {
                services = await _networkDiscoveryService.ScanHostAsync(
                    request.Target, 
                    ports: _networkDiscoveryService.GetCommonPorts(), 
                    fullScan: false,
                    cts.Token);
            }
            
            _logger.LogInformation("Quick scan completed. Found {ServiceCount} services", services.Count());
            return Ok(services);
        }
        catch (OperationCanceledException)
        {
            return StatusCode(408, "Quick scan timed out - use background scan for larger operations");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during quick scan for {Target}", request.Target);
            return StatusCode(500, "Error during quick scan");
        }
    }

    [HttpPost("add-to-services")]
    public async Task<ActionResult<HostedService>> AddDiscoveredServiceToServices([FromBody] AddDiscoveredServiceRequest request)
    {
        try
        {
            _logger.LogInformation("Adding discovered service: {Name} at {HostAddress}:{Port}", 
                request.Name, request.HostAddress, request.Port);

            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest("Service name is required");

            if (string.IsNullOrWhiteSpace(request.HostAddress))
                return BadRequest("Host address is required");

            if (request.Port <= 0 || request.Port > 65535)
                return BadRequest("Invalid port number");

            var protocol = request.ServiceType?.ToLower() switch
            {
                "https" => "https",
                "http" => "http",
                var type when type?.Contains("ssl") == true => "https",
                var type when type?.Contains("tls") == true => "https",
                _ => request.Port == 443 ? "https" : "http"
            };

            var serviceUrl = $"{protocol}://{request.HostAddress}:{request.Port}";

            var hostedService = new HostedService
            {
                Name = request.Name,
                Description = request.Description,
                Url = serviceUrl,
                IsDockerContainer = false,
                LastChecked = DateTime.UtcNow
            };

            var createdService = await _userServices.AddServiceAsync(hostedService);
            
            _logger.LogInformation("Successfully added service: {ServiceId}", createdService.Id);
            return Ok(createdService);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding discovered service: {Name} at {HostAddress}:{Port}", 
                request.Name, request.HostAddress, request.Port);
            
            if (ex.InnerException != null)
                return BadRequest($"Database error: {ex.InnerException.Message}");
            
            return StatusCode(500, $"Error adding service: {ex.Message}");
        }
    }
}