using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using ServicesDashboard.Controllers;
using ServicesDashboard.Models.Results;
using ServicesDashboard.Services.ArtificialIntelligence;
using ServicesDashboard.Services.LogCollection;
using Xunit;

namespace ServicesDashboard.Tests.Controllers;

public class RemoteLogsControllerTests
{
    private readonly Mock<IRemoteLogCollector> _mockLogCollector;
    private readonly Mock<ILogAnalyzer> _mockLogAnalyzer;
    private readonly Mock<ILogger<RemoteLogsController>> _mockLogger;
    private readonly RemoteLogsController _controller;

    public RemoteLogsControllerTests()
    {
        _mockLogCollector = new Mock<IRemoteLogCollector>();
        _mockLogAnalyzer = new Mock<ILogAnalyzer>();
        _mockLogger = new Mock<ILogger<RemoteLogsController>>();
        _controller = new RemoteLogsController(
            _mockLogCollector.Object,
            _mockLogAnalyzer.Object,
            _mockLogger.Object);
    }

    [Fact]
    public async Task GetContainers_WithValidServerId_ReturnsOkWithContainers()
    {
        // Arrange
        var serverId = "server-001";
        var expectedContainers = new List<RemoteContainerResult>
        {
            new RemoteContainerResult 
            { 
                Id = "container1", 
                Name = "web-app", 
                Status = "running", 
                Image = "nginx:latest",
                ServerId = serverId
            },
            new RemoteContainerResult 
            { 
                Id = "container2", 
                Name = "database", 
                Status = "running", 
                Image = "postgres:13",
                ServerId = serverId
            }
        };

        _mockLogCollector.Setup(x => x.ListContainersAsync(serverId))
            .ReturnsAsync(expectedContainers);

        // Act
        var result = await _controller.GetContainers(serverId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var containers = Assert.IsAssignableFrom<IEnumerable<RemoteContainerResult>>(okResult.Value);
        Assert.Equal(2, containers.Count());
        Assert.All(containers, c => Assert.Equal(serverId, c.ServerId));
    }

    [Fact]
    public async Task GetContainers_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var serverId = "server-001";
        _mockLogCollector.Setup(x => x.ListContainersAsync(serverId))
            .ThrowsAsync(new Exception("SSH connection failed"));

        // Act
        var result = await _controller.GetContainers(serverId);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(500, statusResult.StatusCode);
        Assert.Contains("Failed to get containers", statusResult.Value?.ToString());
    }

    [Fact]
    public async Task GetContainerLogs_WithValidParameters_ReturnsOkWithLogs()
    {
        // Arrange
        var serverId = "server-001";
        var containerId = "container1";
        var lines = 50;
        var expectedLogs = "2023-01-01 10:00:00 INFO Application started\n2023-01-01 10:00:01 INFO Ready to serve requests";

        _mockLogCollector.Setup(x => x.GetContainerLogsAsync(serverId, containerId, lines))
            .ReturnsAsync(expectedLogs);

        // Act
        var result = await _controller.GetContainerLogs(serverId, containerId, lines);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(expectedLogs, okResult.Value);
    }

    [Fact]
    public async Task GetContainerLogs_WithDefaultLines_Uses100Lines()
    {
        // Arrange
        var serverId = "server-001";
        var containerId = "container1";
        var expectedLogs = "log content";

        _mockLogCollector.Setup(x => x.GetContainerLogsAsync(serverId, containerId, 100))
            .ReturnsAsync(expectedLogs);

        // Act
        var result = await _controller.GetContainerLogs(serverId, containerId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(expectedLogs, okResult.Value);
        
        // Verify default parameter was used
        _mockLogCollector.Verify(x => x.GetContainerLogsAsync(serverId, containerId, 100), Times.Once);
    }

    [Fact]
    public async Task GetContainerLogs_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var serverId = "server-001";
        var containerId = "container1";
        _mockLogCollector.Setup(x => x.GetContainerLogsAsync(serverId, containerId, It.IsAny<int>()))
            .ThrowsAsync(new Exception("Container not found"));

        // Act
        var result = await _controller.GetContainerLogs(serverId, containerId);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(500, statusResult.StatusCode);
        Assert.Contains("Failed to get container logs", statusResult.Value?.ToString());
    }

    [Fact]
    public async Task DownloadContainerLogs_WithValidParameters_ReturnsFileResult()
    {
        // Arrange
        var serverId = "server-001";
        var containerId = "container1";
        var expectedLogs = "Log content for download";

        _mockLogCollector.Setup(x => x.DownloadContainerLogsAsync(serverId, containerId))
            .ReturnsAsync(expectedLogs);

        // Act
        var result = await _controller.DownloadContainerLogs(serverId, containerId);

        // Assert
        var fileResult = Assert.IsType<FileContentResult>(result);
        Assert.Equal("text/plain", fileResult.ContentType);
        Assert.Equal($"{containerId}-logs.txt", fileResult.FileDownloadName);
        
        var content = System.Text.Encoding.UTF8.GetString(fileResult.FileContents);
        Assert.Equal(expectedLogs, content);
    }

    [Fact]
    public async Task DownloadContainerLogs_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var serverId = "server-001";
        var containerId = "container1";
        _mockLogCollector.Setup(x => x.DownloadContainerLogsAsync(serverId, containerId))
            .ThrowsAsync(new Exception("Download failed"));

        // Act
        var result = await _controller.DownloadContainerLogs(serverId, containerId);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(500, statusResult.StatusCode);
        Assert.Contains("Failed to download container logs", statusResult.Value?.ToString());
    }

    [Fact]
    public async Task GetContainerStats_WithValidParameters_ReturnsOkWithStats()
    {
        // Arrange
        var serverId = "server-001";
        var containerId = "container1";
        var expectedStats = new ContainerStatsResult
        {
            ContainerId = containerId,
            CpuPercentage = 45.5f,
            MemoryUsage = "256MB / 1GB",
            MemoryPercentage = 25.6f,
            NetworkIO = "1.2MB / 850KB",
            BlockIO = "10MB / 5MB",
            Timestamp = DateTimeOffset.UtcNow
        };

        _mockLogCollector.Setup(x => x.GetContainerStatsAsync(serverId, containerId))
            .ReturnsAsync(expectedStats);

        // Act
        var result = await _controller.GetContainerStats(serverId, containerId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var stats = Assert.IsType<ContainerStatsResult>(okResult.Value);
        Assert.Equal(containerId, stats.ContainerId);
        Assert.Equal(45.5f, stats.CpuPercentage);
        Assert.Equal(25.6f, stats.MemoryPercentage);
    }

    [Fact]
    public async Task GetContainerStats_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var serverId = "server-001";
        var containerId = "container1";
        _mockLogCollector.Setup(x => x.GetContainerStatsAsync(serverId, containerId))
            .ThrowsAsync(new Exception("Stats collection failed"));

        // Act
        var result = await _controller.GetContainerStats(serverId, containerId);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(500, statusResult.StatusCode);
        Assert.Contains("Failed to get container stats", statusResult.Value?.ToString());
    }

    [Fact]
    public async Task RestartContainer_WithValidParameters_ReturnsOkWithResult()
    {
        // Arrange
        var serverId = "server-001";
        var containerId = "container1";
        _mockLogCollector.Setup(x => x.RestartContainerAsync(serverId, containerId))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.RestartContainer(serverId, containerId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.True((bool)okResult.Value!);
    }

    [Fact]
    public async Task RestartContainer_WhenFailed_ReturnsOkWithFalse()
    {
        // Arrange
        var serverId = "server-001";
        var containerId = "container1";
        _mockLogCollector.Setup(x => x.RestartContainerAsync(serverId, containerId))
            .ReturnsAsync(false);

        // Act
        var result = await _controller.RestartContainer(serverId, containerId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.False((bool)okResult.Value!);
    }

    [Fact]
    public async Task RestartContainer_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var serverId = "server-001";
        var containerId = "container1";
        _mockLogCollector.Setup(x => x.RestartContainerAsync(serverId, containerId))
            .ThrowsAsync(new Exception("Restart failed"));

        // Act
        var result = await _controller.RestartContainer(serverId, containerId);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(500, statusResult.StatusCode);
        Assert.Contains("Failed to restart container", statusResult.Value?.ToString());
    }

    [Fact]
    public async Task StopContainer_WithValidParameters_ReturnsOkWithResult()
    {
        // Arrange
        var serverId = "server-001";
        var containerId = "container1";
        _mockLogCollector.Setup(x => x.StopContainerAsync(serverId, containerId))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.StopContainer(serverId, containerId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.True((bool)okResult.Value!);
    }

    [Fact]
    public async Task StopContainer_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var serverId = "server-001";
        var containerId = "container1";
        _mockLogCollector.Setup(x => x.StopContainerAsync(serverId, containerId))
            .ThrowsAsync(new Exception("Stop failed"));

        // Act
        var result = await _controller.StopContainer(serverId, containerId);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(500, statusResult.StatusCode);
        Assert.Contains("Failed to stop container", statusResult.Value?.ToString());
    }

    [Fact]
    public async Task StartContainer_WithValidParameters_ReturnsOkWithResult()
    {
        // Arrange
        var serverId = "server-001";
        var containerId = "container1";
        _mockLogCollector.Setup(x => x.StartContainerAsync(serverId, containerId))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.StartContainer(serverId, containerId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.True((bool)okResult.Value!);
    }

    [Fact]
    public async Task StartContainer_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var serverId = "server-001";
        var containerId = "container1";
        _mockLogCollector.Setup(x => x.StartContainerAsync(serverId, containerId))
            .ThrowsAsync(new Exception("Start failed"));

        // Act
        var result = await _controller.StartContainer(serverId, containerId);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(500, statusResult.StatusCode);
        Assert.Contains("Failed to start container", statusResult.Value?.ToString());
    }

    [Theory]
    [InlineData("server-001", "container1")]
    [InlineData("server-production", "web-container")]
    [InlineData("server-dev", "database-container")]
    public async Task GetContainers_WithDifferentServerIds_CallsCorrectService(string serverId, string containerId)
    {
        // Arrange
        var containers = new List<RemoteContainerResult>
        {
            new RemoteContainerResult { Id = containerId, ServerId = serverId, Name = "test", Status = "running", Image = "test:latest" }
        };
        
        _mockLogCollector.Setup(x => x.ListContainersAsync(serverId))
            .ReturnsAsync(containers);

        // Act
        var result = await _controller.GetContainers(serverId);

        // Assert
        _mockLogCollector.Verify(x => x.ListContainersAsync(serverId), Times.Once);
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returnedContainers = Assert.IsAssignableFrom<IEnumerable<RemoteContainerResult>>(okResult.Value);
        Assert.Single(returnedContainers);
    }
}