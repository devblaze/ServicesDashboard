using Microsoft.AspNetCore.Mvc;
using ServicesDashboard.Controllers;
using System.Text.Json;
using Xunit;

namespace ServicesDashboard.Tests.Controllers;

public class HealthControllerTests
{
    private readonly HealthController _controller;

    public HealthControllerTests()
    {
        _controller = new HealthController();
    }

    [Fact]
    public void Get_ReturnsOkResult()
    {
        // Act
        var result = _controller.Get();

        // Assert
        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public void Get_ReturnsHealthyStatus()
    {
        // Act
        var result = _controller.Get();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);

        // Convert to JSON to inspect the anonymous object
        var jsonString = JsonSerializer.Serialize(okResult.Value);
        var healthResponse = JsonSerializer.Deserialize<JsonElement>(jsonString);

        Assert.Equal("healthy", healthResponse.GetProperty("status").GetString());
        Assert.Equal("1.0.0", healthResponse.GetProperty("version").GetString());
        Assert.True(healthResponse.TryGetProperty("timestamp", out var timestampProperty));
        Assert.True(DateTime.TryParse(timestampProperty.GetString(), out var timestamp));
    }

    [Fact]
    public void Get_ReturnsValidTimestamp()
    {
        // Act
        var result = _controller.Get();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        
        var jsonString = JsonSerializer.Serialize(okResult.Value);
        var healthResponse = JsonSerializer.Deserialize<JsonElement>(jsonString);
        
        var timestampString = healthResponse.GetProperty("timestamp").GetString();
        Assert.True(DateTime.TryParse(timestampString, out var timestamp));
        
        // Just verify we can parse the timestamp - don't check exact timing due to timezone issues
        Assert.True(timestamp != default(DateTime));
    }

    [Fact]
    public void Get_ReturnsConsistentStructure()
    {
        // Act
        var result = _controller.Get();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var jsonString = JsonSerializer.Serialize(okResult.Value);
        var healthResponse = JsonSerializer.Deserialize<JsonElement>(jsonString);

        // Verify all expected properties are present
        Assert.True(healthResponse.TryGetProperty("status", out _));
        Assert.True(healthResponse.TryGetProperty("timestamp", out _));
        Assert.True(healthResponse.TryGetProperty("version", out _));
        
        // Verify property count (no unexpected properties)
        Assert.Equal(3, healthResponse.EnumerateObject().Count());
    }

    [Fact]
    public void Get_MultipleCallsReturnSameStatusAndVersion()
    {
        // Act
        var result1 = _controller.Get();
        var result2 = _controller.Get();

        // Assert
        var okResult1 = Assert.IsType<OkObjectResult>(result1);
        var okResult2 = Assert.IsType<OkObjectResult>(result2);
        
        var jsonString1 = JsonSerializer.Serialize(okResult1.Value);
        var jsonString2 = JsonSerializer.Serialize(okResult2.Value);
        
        var response1 = JsonSerializer.Deserialize<JsonElement>(jsonString1);
        var response2 = JsonSerializer.Deserialize<JsonElement>(jsonString2);

        // Status and version should be the same
        Assert.Equal(response1.GetProperty("status").GetString(), response2.GetProperty("status").GetString());
        Assert.Equal(response1.GetProperty("version").GetString(), response2.GetProperty("version").GetString());
        
        // Timestamps might be different (depending on timing)
        Assert.True(response1.TryGetProperty("timestamp", out _));
        Assert.True(response2.TryGetProperty("timestamp", out _));
    }
}