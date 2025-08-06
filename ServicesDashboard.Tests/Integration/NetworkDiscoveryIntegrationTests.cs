using Microsoft.AspNetCore.Mvc.Testing;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.VisualStudio.TestPlatform.TestHost;
using ServicesDashboard.Controllers;
using ServicesDashboard.Models.Requests;
using Xunit;

namespace ServicesDashboard.Tests.Integration;

public class NetworkDiscoveryIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public NetworkDiscoveryIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task GetCommonPorts_ReturnsSuccessAndCorrectContentType()
    {
        // Act
        var response = await _client.GetAsync("/api/NetworkDiscovery/common-ports");

        // Assert
        response.EnsureSuccessStatusCode();
        Assert.Equal("application/json; charset=utf-8", 
            response.Content.Headers.ContentType?.ToString());

        var content = await response.Content.ReadAsStringAsync();
        var ports = JsonSerializer.Deserialize<int[]>(content);
        Assert.NotNull(ports);
        Assert.Contains(80, ports);
        Assert.Contains(443, ports);
    }

    [Fact]
    public async Task ScanNetwork_WithValidRequest_ReturnsSuccess()
    {
        // Arrange
        var request = new NetworkScanRequest
        {
            NetworkRange = "127.0.0.1/32",
            Ports = new[] { 80 }
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/NetworkDiscovery/scan-network", request);

        // Assert
        response.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task ScanHost_WithValidRequest_ReturnsSuccess()
    {
        // Arrange
        var request = new HostScanRequest
        {
            HostAddress = "127.0.0.1",
            Ports = new[] { 80 }
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/NetworkDiscovery/scan-host", request);

        // Assert
        response.EnsureSuccessStatusCode();
    }
}
