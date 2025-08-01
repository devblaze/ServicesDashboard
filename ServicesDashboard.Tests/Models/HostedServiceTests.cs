using ServicesDashboard.Models;
using Xunit;

namespace ServicesDashboard.Tests.Models;

public class HostedServiceTests
{
    [Fact]
    public void HostedService_DefaultValues_AreSetCorrectly()
    {
        // Act
        var service = new HostedService();

        // Assert
        Assert.Equal(Guid.Empty, service.Id);
        Assert.Equal(string.Empty, service.Name);
        Assert.Equal(string.Empty, service.Description);
        Assert.Equal(string.Empty, service.Url);
        Assert.Equal(string.Empty, service.ContainerId);
        Assert.False(service.IsDockerContainer);
        Assert.Equal("Unknown", service.Status);
    }

    [Fact]
    public void HostedService_Properties_CanBeSet()
    {
        // Arrange
        var id = Guid.NewGuid();
        var name = "Test Service";
        var description = "Test Description";
        var url = "http://localhost:8080";
        var containerId = "container123";
        var status = "Running";
        var now = DateTime.UtcNow;

        // Act
        var service = new HostedService
        {
            Id = id,
            Name = name,
            Description = description,
            Url = url,
            ContainerId = containerId,
            IsDockerContainer = true,
            Status = status,
            LastChecked = now,
            DateAdded = now
        };

        // Assert
        Assert.Equal(id, service.Id);
        Assert.Equal(name, service.Name);
        Assert.Equal(description, service.Description);
        Assert.Equal(url, service.Url);
        Assert.Equal(containerId, service.ContainerId);
        Assert.True(service.IsDockerContainer);
        Assert.Equal(status, service.Status);
        Assert.Equal(now, service.LastChecked);
        Assert.Equal(now, service.DateAdded);
    }
}
