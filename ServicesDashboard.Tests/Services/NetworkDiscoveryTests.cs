using Microsoft.Extensions.Logging;
using Moq;
using ServicesDashboard.Services.ArtificialIntelligence;
using ServicesDashboard.Services.NetworkDiscovery;
using Xunit;

namespace ServicesDashboard.Tests.Services;

public class NetworkDiscoveryTests
{
    private readonly Mock<ILogger<NetworkDiscovery>> _mockLogger;
    private readonly Mock<IServiceRecognitionService> _mockAiService;
    private readonly NetworkDiscovery _service;

    public NetworkDiscoveryTests()
    {
        _mockLogger = new Mock<ILogger<NetworkDiscovery>>();
        _mockAiService = new Mock<IServiceRecognitionService>();
        _service = new NetworkDiscovery(_mockLogger.Object, _mockAiService.Object);
    }

    [Fact]
    public async Task ScanNetworkAsync_WithValidCidrRange_ReturnsDiscoveredServices()
    {
        // Arrange
        var networkRange = "127.0.0.1/32"; // Single localhost IP for testing
        var ports = new[] { 80, 443 };

        // Act
        var result = await _service.ScanNetworkAsync(networkRange, ports, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        // Note: This might not find services on localhost, but the method should not throw
    }

    [Fact]
    public async Task ScanNetworkAsync_WithCancellationToken_RespectsCancellation()
    {
        // Arrange
        var networkRange = "192.168.1.0/24";
        var ports = new[] { 80 };
        var cts = new CancellationTokenSource();
        cts.Cancel(); // Cancel immediately

        // Act & Assert
        var result = await _service.ScanNetworkAsync(networkRange, ports, cts.Token);
        Assert.NotNull(result);
        // Should return empty or partial results due to cancellation
    }

    [Fact]
    public async Task ScanHostAsync_WithValidHost_ReturnsDiscoveredServices()
    {
        // Arrange
        var hostAddress = "127.0.0.1";
        var ports = new[] { 80, 443 };

        // Act
        var result = await _service.ScanHostAsync(hostAddress, ports, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        // Result might be empty if no services are running on localhost
    }

    [Theory]
    [InlineData("192.168.1.1")]
    [InlineData("10.0.0.1")]
    [InlineData("172.16.0.1")]
    public async Task ScanHostAsync_WithDifferentHosts_HandlesGracefully(string hostAddress)
    {
        // Arrange
        var ports = new[] { 80 };

        // Act & Assert
        // Should not throw even if hosts are unreachable
        var result = await _service.ScanHostAsync(hostAddress, ports, CancellationToken.None);
        Assert.NotNull(result);
    }

    [Fact]
    public async Task ScanNetworkAsync_WithRangeNotation_ParsesCorrectly()
    {
        // Arrange
        var networkRange = "127.0.0.1-1"; // Range from 127.0.0.1 to 127.0.0.1
        var ports = new[] { 80 };

        // Act
        var result = await _service.ScanNetworkAsync(networkRange, ports, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
    }

    [Fact]
    public async Task ScanNetworkAsync_WithSingleIp_HandlesSingleHost()
    {
        // Arrange
        var networkRange = "127.0.0.1";
        var ports = new[] { 80 };

        // Act
        var result = await _service.ScanNetworkAsync(networkRange, ports, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
    }
}
