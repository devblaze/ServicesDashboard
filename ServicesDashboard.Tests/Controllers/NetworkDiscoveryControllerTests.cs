using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using ServicesDashboard.Controllers;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Requests; // Add this using statement
using ServicesDashboard.Services;
using ServicesDashboard.Services.NetworkDiscovery;
using Xunit;

namespace ServicesDashboard.Tests.Controllers;

public class NetworkDiscoveryControllerTests
{
    private readonly Mock<INetworkDiscoveryService> _mockNetworkDiscoveryService;
    private readonly Mock<IServiceManager> _mockServiceManager;
    private readonly Mock<ILogger<NetworkDiscoveryController>> _mockLogger;
    private readonly NetworkDiscoveryController _controller;

    public NetworkDiscoveryControllerTests()
    {
        _mockNetworkDiscoveryService = new Mock<INetworkDiscoveryService>();
        _mockServiceManager = new Mock<IServiceManager>();
        _mockLogger = new Mock<ILogger<NetworkDiscoveryController>>();
        _controller = new NetworkDiscoveryController(
            _mockNetworkDiscoveryService.Object,
            _mockServiceManager.Object,
            _mockLogger.Object);
    }

    [Fact]
    public async Task ScanNetwork_WithValidRequest_ReturnsOkResult()
    {
        // Arrange
        var request = new NetworkScanRequest { NetworkRange = "192.168.1.0/24" };
        var expectedServices = new List<DiscoveredService>
        {
            new DiscoveredService
            {
                HostAddress = "192.168.1.1",
                HostName = "router",
                Port = 80,
                IsReachable = true,
                ServiceType = "HTTP"
            }
        };

        _mockNetworkDiscoveryService
            .Setup(x => x.ScanNetworkAsync(It.IsAny<string>(), It.IsAny<int[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedServices);

        // Act
        var result = await _controller.ScanNetwork(request); // Remove CancellationToken.None

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var services = Assert.IsAssignableFrom<IEnumerable<DiscoveredService>>(okResult.Value);
        Assert.Single(services);
    }

    [Fact]
    public async Task ScanNetwork_WithException_ReturnsServerError()
    {
        // Arrange
        var request = new NetworkScanRequest { NetworkRange = "invalid" };
        _mockNetworkDiscoveryService
            .Setup(x => x.ScanNetworkAsync(It.IsAny<string>(), It.IsAny<int[]>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Network scan failed"));

        // Act
        var result = await _controller.ScanNetwork(request); // Remove CancellationToken.None

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(500, statusResult.StatusCode);
        Assert.Equal("Error during network scan", statusResult.Value);
    }

    [Fact]
    public async Task ScanHost_WithValidRequest_ReturnsOkResult()
    {
        // Arrange
        var request = new HostScanRequest { HostAddress = "192.168.1.1" };
        var expectedServices = new List<DiscoveredService>
        {
            new DiscoveredService
            {
                HostAddress = "192.168.1.1",
                Port = 22,
                IsReachable = true,
                ServiceType = "SSH"
            }
        };

        _mockNetworkDiscoveryService
            .Setup(x => x.ScanHostAsync(It.IsAny<string>(), It.IsAny<int[]>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedServices);

        // Act
        var result = await _controller.ScanHost(request); // Remove CancellationToken.None

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var services = Assert.IsAssignableFrom<IEnumerable<DiscoveredService>>(okResult.Value);
        Assert.Single(services);
    }

    [Fact]
    public async Task AddDiscoveredServiceToServices_WithValidRequest_ReturnsOkResult()
    {
        // Arrange
        var request = new AddDiscoveredServiceRequest
        {
            Name = "Test Service",
            HostAddress = "192.168.1.1",
            Port = 80,
            ServiceType = "HTTP"
        };

        var expectedService = new HostedService
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Url = "http://192.168.1.1:80"
        };

        _mockServiceManager
            .Setup(x => x.AddServiceAsync(It.IsAny<HostedService>()))
            .ReturnsAsync(expectedService);

        // Act
        var result = await _controller.AddDiscoveredServiceToServices(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var service = Assert.IsType<HostedService>(okResult.Value);
        Assert.Equal(request.Name, service.Name);
    }

    [Fact]
    public void GetCommonPorts_ReturnsExpectedPorts()
    {
        // Act
        var result = _controller.GetCommonPorts();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var ports = Assert.IsType<int[]>(okResult.Value);
        Assert.Contains(80, ports);
        Assert.Contains(443, ports);
        Assert.Contains(22, ports);
    }

    [Theory]
    [InlineData("192.168.1.1", 80, "http", "http://192.168.1.1:80")]
    [InlineData("192.168.1.1", 443, "https", "https://192.168.1.1:443")]
    [InlineData("192.168.1.1", 8080, "http alt", "http://192.168.1.1:8080")]
    [InlineData("192.168.1.1", 3306, "mysql", "http://192.168.1.1:3306")]
    public async Task AddDiscoveredServiceToServices_GeneratesCorrectUrl(
        string hostAddress, int port, string serviceType, string expectedUrl)
    {
        // Arrange
        var request = new AddDiscoveredServiceRequest
        {
            Name = "Test Service",
            HostAddress = hostAddress,
            Port = port,
            ServiceType = serviceType
        };

        HostedService? capturedService = null;
        _mockServiceManager
            .Setup(x => x.AddServiceAsync(It.IsAny<HostedService>()))
            .Callback<HostedService>(service => capturedService = service)
            .ReturnsAsync(new HostedService { Id = Guid.NewGuid() });

        // Act
        await _controller.AddDiscoveredServiceToServices(request);

        // Assert
        Assert.NotNull(capturedService);
        Assert.Equal(expectedUrl, capturedService.Url);
    }
}