using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using ServicesDashboard.Controllers;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Docker;
using ServicesDashboard.Services.Servers;
using Xunit;

namespace ServicesDashboard.Tests.Controllers;

public class DockerServicesControllerTests
{
    private readonly Mock<IServerManagementService> _mockServerManagementService;
    private readonly Mock<IDockerServicesService> _mockDockerServicesService;
    private readonly Mock<ILogger<DockerServicesController>> _mockLogger;
    private readonly DockerServicesController _controller;

    public DockerServicesControllerTests()
    {
        _mockServerManagementService = new Mock<IServerManagementService>();
        _mockDockerServicesService = new Mock<IDockerServicesService>();
        _mockLogger = new Mock<ILogger<DockerServicesController>>();
        _controller = new DockerServicesController(
            _mockServerManagementService.Object,
            _mockDockerServicesService.Object,
            _mockLogger.Object);
    }

    [Fact]
    public async Task GetAllDockerServices_ReturnsOkWithServices()
    {
        // Arrange
        var servers = new List<ManagedServer>
        {
            new ManagedServer { Id = 1, Name = "Server 1", HostAddress = "192.168.1.1", Status = ServerStatus.Online },
            new ManagedServer { Id = 2, Name = "Server 2", HostAddress = "192.168.1.2", Status = ServerStatus.Online }
        };

        var discoveryResult1 = new DockerServiceDiscoveryResult
        {
            Success = true,
            Services = new List<DockerService>
            {
                new DockerService
                {
                    ContainerId = "container1",
                    Name = "nginx",
                    Image = "nginx:latest",
                    Status = "running",
                    CreatedAt = DateTime.UtcNow,
                    Ports = new List<DockerPort>
                    {
                        new DockerPort { ContainerPort = 80, HostPort = 8080, Protocol = "tcp", HostIp = "0.0.0.0" }
                    }
                }
            }
        };

        var discoveryResult2 = new DockerServiceDiscoveryResult
        {
            Success = true,
            Services = new List<DockerService>
            {
                new DockerService
                {
                    ContainerId = "container2",
                    Name = "postgres",
                    Image = "postgres:16",
                    Status = "running",
                    CreatedAt = DateTime.UtcNow,
                    Ports = new List<DockerPort>
                    {
                        new DockerPort { ContainerPort = 5432, HostPort = 5432, Protocol = "tcp" }
                    }
                }
            }
        };

        var expectedServices = new List<DockerServiceWithServer>
        {
            new DockerServiceWithServer
            {
                ContainerId = "container1",
                Name = "nginx",
                Image = "nginx:latest",
                Status = "running",
                State = "running",
                ServerId = 1,
                ServerName = "Server 1",
                ServerHostAddress = "192.168.1.1",
                Order = 0
            },
            new DockerServiceWithServer
            {
                ContainerId = "container2",
                Name = "postgres",
                Image = "postgres:16",
                Status = "running",
                State = "running",
                ServerId = 2,
                ServerName = "Server 2",
                ServerHostAddress = "192.168.1.2",
                Order = 1
            }
        };

        _mockServerManagementService.Setup(x => x.GetServersAsync()).ReturnsAsync(servers);
        _mockServerManagementService.Setup(x => x.DiscoverDockerServicesAsync(1)).ReturnsAsync(discoveryResult1);
        _mockServerManagementService.Setup(x => x.DiscoverDockerServicesAsync(2)).ReturnsAsync(discoveryResult2);
        _mockDockerServicesService.Setup(x => x.ApplyArrangementsAsync(It.IsAny<List<DockerServiceWithServer>>()))
            .ReturnsAsync(expectedServices);

        // Act
        var result = await _controller.GetAllDockerServices();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var services = Assert.IsAssignableFrom<IEnumerable<DockerServiceWithServer>>(okResult.Value);
        Assert.Equal(2, services.Count());
    }

    [Fact]
    public async Task GetAllDockerServices_SkipsOfflineServers()
    {
        // Arrange
        var servers = new List<ManagedServer>
        {
            new ManagedServer { Id = 1, Name = "Server 1", HostAddress = "192.168.1.1", Status = ServerStatus.Online },
            new ManagedServer { Id = 2, Name = "Server 2", HostAddress = "192.168.1.2", Status = ServerStatus.Offline }
        };

        var discoveryResult = new DockerServiceDiscoveryResult
        {
            Success = true,
            Services = new List<DockerService>
            {
                new DockerService { ContainerId = "container1", Name = "nginx", Image = "nginx:latest", Status = "running", CreatedAt = DateTime.UtcNow }
            }
        };

        _mockServerManagementService.Setup(x => x.GetServersAsync()).ReturnsAsync(servers);
        _mockServerManagementService.Setup(x => x.DiscoverDockerServicesAsync(1)).ReturnsAsync(discoveryResult);
        _mockDockerServicesService.Setup(x => x.ApplyArrangementsAsync(It.IsAny<List<DockerServiceWithServer>>()))
            .ReturnsAsync(new List<DockerServiceWithServer>());

        // Act
        var result = await _controller.GetAllDockerServices();

        // Assert
        _mockServerManagementService.Verify(x => x.DiscoverDockerServicesAsync(2), Times.Never);
    }

    [Fact]
    public async Task GetAllDockerServices_HandlesServerDiscoveryFailure()
    {
        // Arrange
        var servers = new List<ManagedServer>
        {
            new ManagedServer { Id = 1, Name = "Server 1", HostAddress = "192.168.1.1", Status = ServerStatus.Online }
        };

        _mockServerManagementService.Setup(x => x.GetServersAsync()).ReturnsAsync(servers);
        _mockServerManagementService.Setup(x => x.DiscoverDockerServicesAsync(1))
            .ThrowsAsync(new Exception("Connection failed"));
        _mockDockerServicesService.Setup(x => x.ApplyArrangementsAsync(It.IsAny<List<DockerServiceWithServer>>()))
            .ReturnsAsync(new List<DockerServiceWithServer>());

        // Act
        var result = await _controller.GetAllDockerServices();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var services = Assert.IsAssignableFrom<IEnumerable<DockerServiceWithServer>>(okResult.Value);
        Assert.Empty(services);
    }

    [Fact]
    public async Task GetAllDockerServices_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        _mockServerManagementService.Setup(x => x.GetServersAsync()).ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _controller.GetAllDockerServices();

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(500, statusResult.StatusCode);
    }

    [Fact]
    public async Task UpdateArrangements_WithValidData_ReturnsOk()
    {
        // Arrange
        var arrangements = new List<DockerServiceArrangementDto>
        {
            new DockerServiceArrangementDto { ServerId = 1, ContainerId = "container1", ContainerName = "nginx", Order = 0 },
            new DockerServiceArrangementDto { ServerId = 1, ContainerId = "container2", ContainerName = "postgres", Order = 1 }
        };

        _mockDockerServicesService.Setup(x => x.UpdateArrangementsAsync(arrangements)).Returns(Task.CompletedTask);

        // Act
        var result = await _controller.UpdateArrangements(arrangements);

        // Assert
        Assert.IsType<OkResult>(result);
        _mockDockerServicesService.Verify(x => x.UpdateArrangementsAsync(arrangements), Times.Once);
    }

    [Fact]
    public async Task UpdateArrangements_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var arrangements = new List<DockerServiceArrangementDto>();
        _mockDockerServicesService.Setup(x => x.UpdateArrangementsAsync(arrangements))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _controller.UpdateArrangements(arrangements);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(500, statusResult.StatusCode);
    }

    [Fact]
    public async Task StartContainer_WithValidParameters_ReturnsOk()
    {
        // Arrange
        var serverId = 1;
        var containerId = "container1";
        _mockServerManagementService.Setup(x => x.StartDockerContainerAsync(serverId, containerId))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.StartContainer(serverId, containerId);

        // Assert
        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task StartContainer_WhenFails_ReturnsBadRequest()
    {
        // Arrange
        var serverId = 1;
        var containerId = "container1";
        _mockServerManagementService.Setup(x => x.StartDockerContainerAsync(serverId, containerId))
            .ReturnsAsync(false);

        // Act
        var result = await _controller.StartContainer(serverId, containerId);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Failed to start container", badRequestResult.Value);
    }

    [Fact]
    public async Task StartContainer_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var serverId = 1;
        var containerId = "container1";
        _mockServerManagementService.Setup(x => x.StartDockerContainerAsync(serverId, containerId))
            .ThrowsAsync(new Exception("Connection error"));

        // Act
        var result = await _controller.StartContainer(serverId, containerId);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(500, statusResult.StatusCode);
    }

    [Fact]
    public async Task StopContainer_WithValidParameters_ReturnsOk()
    {
        // Arrange
        var serverId = 1;
        var containerId = "container1";
        _mockServerManagementService.Setup(x => x.StopDockerContainerAsync(serverId, containerId))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.StopContainer(serverId, containerId);

        // Assert
        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task StopContainer_WhenFails_ReturnsBadRequest()
    {
        // Arrange
        var serverId = 1;
        var containerId = "container1";
        _mockServerManagementService.Setup(x => x.StopDockerContainerAsync(serverId, containerId))
            .ReturnsAsync(false);

        // Act
        var result = await _controller.StopContainer(serverId, containerId);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Failed to stop container", badRequestResult.Value);
    }

    [Fact]
    public async Task StopContainer_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var serverId = 1;
        var containerId = "container1";
        _mockServerManagementService.Setup(x => x.StopDockerContainerAsync(serverId, containerId))
            .ThrowsAsync(new Exception("Connection error"));

        // Act
        var result = await _controller.StopContainer(serverId, containerId);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(500, statusResult.StatusCode);
    }

    [Fact]
    public async Task RestartContainer_WithValidParameters_ReturnsOk()
    {
        // Arrange
        var serverId = 1;
        var containerId = "container1";
        _mockServerManagementService.Setup(x => x.RestartDockerContainerAsync(serverId, containerId))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.RestartContainer(serverId, containerId);

        // Assert
        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task RestartContainer_WhenFails_ReturnsBadRequest()
    {
        // Arrange
        var serverId = 1;
        var containerId = "container1";
        _mockServerManagementService.Setup(x => x.RestartDockerContainerAsync(serverId, containerId))
            .ReturnsAsync(false);

        // Act
        var result = await _controller.RestartContainer(serverId, containerId);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Failed to restart container", badRequestResult.Value);
    }

    [Fact]
    public async Task RestartContainer_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var serverId = 1;
        var containerId = "container1";
        _mockServerManagementService.Setup(x => x.RestartDockerContainerAsync(serverId, containerId))
            .ThrowsAsync(new Exception("Connection error"));

        // Act
        var result = await _controller.RestartContainer(serverId, containerId);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(500, statusResult.StatusCode);
    }

    [Theory]
    [InlineData(1, "container123")]
    [InlineData(5, "web-server")]
    [InlineData(10, "database-01")]
    public async Task ContainerOperations_WithDifferentIds_CallsCorrectService(int serverId, string containerId)
    {
        // Arrange
        _mockServerManagementService.Setup(x => x.StartDockerContainerAsync(serverId, containerId)).ReturnsAsync(true);
        _mockServerManagementService.Setup(x => x.StopDockerContainerAsync(serverId, containerId)).ReturnsAsync(true);
        _mockServerManagementService.Setup(x => x.RestartDockerContainerAsync(serverId, containerId)).ReturnsAsync(true);

        // Act & Assert - Start
        await _controller.StartContainer(serverId, containerId);
        _mockServerManagementService.Verify(x => x.StartDockerContainerAsync(serverId, containerId), Times.Once);

        // Act & Assert - Stop
        await _controller.StopContainer(serverId, containerId);
        _mockServerManagementService.Verify(x => x.StopDockerContainerAsync(serverId, containerId), Times.Once);

        // Act & Assert - Restart
        await _controller.RestartContainer(serverId, containerId);
        _mockServerManagementService.Verify(x => x.RestartDockerContainerAsync(serverId, containerId), Times.Once);
    }
}
