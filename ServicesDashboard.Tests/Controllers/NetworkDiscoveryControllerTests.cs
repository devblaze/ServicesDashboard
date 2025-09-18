using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using ServicesDashboard.Controllers;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Requests;
using ServicesDashboard.Models.Results;
using ServicesDashboard.Services;
using ServicesDashboard.Services.NetworkDiscovery;
using Xunit;

namespace ServicesDashboard.Tests.Controllers;

public class NetworkDiscoveryControllerTests
{
    private readonly Mock<INetworkDiscoveryService> _mockNetworkDiscoveryService;
    private readonly Mock<IBackgroundNetworkScanService> _mockBackgroundScanService;
    private readonly Mock<IUserServices> _mockServiceManager;
    private readonly Mock<ILogger<NetworkDiscoveryController>> _mockLogger;
    private readonly Mock<IServiceProvider> _mockServiceProvider;
    private readonly NetworkDiscoveryController _controller;

    public NetworkDiscoveryControllerTests()
    {
        _mockNetworkDiscoveryService = new Mock<INetworkDiscoveryService>();
        _mockBackgroundScanService = new Mock<IBackgroundNetworkScanService>();
        _mockServiceManager = new Mock<IUserServices>();
        _mockLogger = new Mock<ILogger<NetworkDiscoveryController>>();
        _mockServiceProvider = new Mock<IServiceProvider>();
        _controller = new NetworkDiscoveryController(
            _mockNetworkDiscoveryService.Object,
            _mockBackgroundScanService.Object,
            _mockServiceManager.Object,
            _mockLogger.Object,
            _mockServiceProvider.Object);
    }

    [Fact]
    public async Task StartScan_WithValidRequest_ReturnsOkResult()
    {
        // Arrange
        var request = new StartScanRequest 
        { 
            Target = "192.168.1.0/24",
            ScanType = "Network",
            Ports = new[] { 80, 443, 22 },
            FullScan = false
        };
        var expectedScanId = Guid.NewGuid();

        _mockBackgroundScanService
            .Setup(x => x.StartScanAsync(request.Target, request.ScanType, request.Ports, request.FullScan))
            .ReturnsAsync(expectedScanId);

        // Act
        var result = await _controller.StartScan(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.NotNull(okResult.Value);
        // Verify the response structure
        var responseJson = System.Text.Json.JsonSerializer.Serialize(okResult.Value);
        Assert.Contains("scanId", responseJson);
        Assert.Contains("message", responseJson);
    }

    [Fact]
    public async Task StartScan_WithException_ReturnsServerError()
    {
        // Arrange
        var request = new StartScanRequest { Target = "invalid" };
        _mockBackgroundScanService
            .Setup(x => x.StartScanAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int[]>(), It.IsAny<bool>()))
            .ThrowsAsync(new Exception("Scan failed"));

        // Act
        var result = await _controller.StartScan(request);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(500, statusResult.StatusCode);
        Assert.Equal("Error starting scan", statusResult.Value);
    }

    [Fact]
    public async Task GetScanStatus_WithValidScanId_ReturnsOkResult()
    {
        // Arrange
        var scanId = Guid.NewGuid();
        var scanSession = new NetworkScanSession
        {
            Id = scanId,
            Target = "192.168.1.0/24",
            ScanType = "Network",
            Status = "Completed",
            StartedAt = DateTime.UtcNow.AddMinutes(-5),
            CompletedAt = DateTime.UtcNow,
            DiscoveredServices = new List<StoredDiscoveredService>()
        };

        _mockBackgroundScanService
            .Setup(x => x.GetScanStatusAsync(scanId))
            .ReturnsAsync(scanSession);

        // Act
        var result = await _controller.GetScanStatus(scanId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task GetScanStatus_WithInvalidScanId_ReturnsNotFound()
    {
        // Arrange
        var scanId = Guid.NewGuid();
        _mockBackgroundScanService
            .Setup(x => x.GetScanStatusAsync(scanId))
            .ReturnsAsync((NetworkScanSession?)null);

        // Act
        var result = await _controller.GetScanStatus(scanId);

        // Assert
        var notFoundResult = Assert.IsType<NotFoundObjectResult>(result.Result);
        Assert.Equal("Scan not found", notFoundResult.Value);
    }

    [Fact]
    public void GetCommonPorts_ReturnsExpectedPorts()
    {
        // Arrange
        var expectedPorts = new[] { 80, 443, 22, 21, 25, 53, 110, 143, 993, 995 };
        _mockNetworkDiscoveryService.Setup(x => x.GetCommonPorts()).Returns(expectedPorts);

        // Act
        var result = _controller.GetCommonPorts();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var ports = Assert.IsType<int[]>(okResult.Value);
        Assert.Contains(80, ports);
        Assert.Contains(443, ports);
        Assert.Contains(22, ports);
    }

    [Fact]
    public void GetExtendedPorts_ReturnsExpectedPorts()
    {
        // Arrange
        var expectedPorts = new[] { 8080, 8443, 3306, 5432, 6379, 27017, 9200, 5601 };
        _mockNetworkDiscoveryService.Setup(x => x.GetExtendedPorts()).Returns(expectedPorts);

        // Act
        var result = _controller.GetExtendedPorts();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var ports = Assert.IsType<int[]>(okResult.Value);
        Assert.Contains(8080, ports);
        Assert.Contains(3306, ports);
    }

    [Fact]
    public async Task GetScanResults_WithValidScanId_ReturnsResults()
    {
        // Arrange
        var scanId = Guid.NewGuid();
        var expectedResults = new List<StoredDiscoveredService>
        {
            new StoredDiscoveredService
            {
                Id = 1,
                ScanId = scanId,
                HostAddress = "192.168.1.1",
                Port = 80,
                IsReachable = true,
                ServiceType = "HTTP",
                DiscoveredAt = DateTime.UtcNow
            }
        };

        _mockBackgroundScanService
            .Setup(x => x.GetScanResultsAsync(scanId))
            .ReturnsAsync(expectedResults);

        // Act
        var result = await _controller.GetScanResults(scanId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var results = Assert.IsAssignableFrom<IEnumerable<StoredDiscoveredService>>(okResult.Value);
        Assert.Single(results);
    }

    [Fact]
    public async Task GetRecentScans_ReturnsRecentScansList()
    {
        // Arrange
        var expectedScans = new List<NetworkScanSession>
        {
            new NetworkScanSession 
            { 
                Id = Guid.NewGuid(), 
                Target = "192.168.1.0/24", 
                StartedAt = DateTime.UtcNow.AddHours(-1) 
            },
            new NetworkScanSession 
            { 
                Id = Guid.NewGuid(), 
                Target = "10.0.0.0/24", 
                StartedAt = DateTime.UtcNow.AddHours(-2) 
            }
        };

        _mockBackgroundScanService
            .Setup(x => x.GetRecentScansAsync(10))
            .ReturnsAsync(expectedScans);

        // Act
        var result = await _controller.GetRecentScans();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var scans = Assert.IsAssignableFrom<IEnumerable<NetworkScanSession>>(okResult.Value);
        Assert.Equal(2, scans.Count());
    }
}