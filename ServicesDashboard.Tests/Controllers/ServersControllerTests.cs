using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using ServicesDashboard.Controllers;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Servers;
using Xunit;

namespace ServicesDashboard.Tests.Controllers;

public class ServersControllerTests
{
    private readonly Mock<IServerConnectionManager> _mockConnectionManager;
    private readonly Mock<ILogger<ServersController>> _mockLogger;
    private readonly ServersController _controller;

    public ServersControllerTests()
    {
        _mockConnectionManager = new Mock<IServerConnectionManager>();
        _mockLogger = new Mock<ILogger<ServersController>>();
        _controller = new ServersController(_mockConnectionManager.Object, _mockLogger.Object);
    }

    [Fact]
    public async Task GetAllConnections_ReturnsOkWithConnections()
    {
        // Arrange
        var expectedConnections = new List<ServerConnection>
        {
            new ServerConnection { Id = "1", Name = "Server 1", Host = "192.168.1.1" },
            new ServerConnection { Id = "2", Name = "Server 2", Host = "192.168.1.2" }
        };

        _mockConnectionManager.Setup(x => x.GetAllConnectionsAsync()).ReturnsAsync(expectedConnections);

        // Act
        var result = await _controller.GetAllConnections();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var connections = Assert.IsAssignableFrom<IEnumerable<ServerConnection>>(okResult.Value);
        Assert.Equal(2, connections.Count());
    }

    [Fact]
    public async Task GetConnection_WithValidId_ReturnsOkWithConnection()
    {
        // Arrange
        var connectionId = "test-id";
        var expectedConnection = new ServerConnection { Id = connectionId, Name = "Test Server" };
        _mockConnectionManager.Setup(x => x.GetConnectionByIdAsync(connectionId)).ReturnsAsync(expectedConnection);

        // Act
        var result = await _controller.GetConnection(connectionId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var connection = Assert.IsType<ServerConnection>(okResult.Value);
        Assert.Equal(connectionId, connection.Id);
    }

    [Fact]
    public async Task GetConnection_WithInvalidId_ReturnsNotFound()
    {
        // Arrange
        var connectionId = "invalid-id";
        _mockConnectionManager.Setup(x => x.GetConnectionByIdAsync(connectionId)).ReturnsAsync((ServerConnection?)null);

        // Act
        var result = await _controller.GetConnection(connectionId);

        // Assert
        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task AddConnection_WithValidData_ReturnsCreatedAtAction()
    {
        // Arrange
        var connectionDto = new ServerConnectionDto
        {
            Name = "New Server",
            Host = "192.168.1.10",
            Username = "admin"
        };

        var createdConnection = new ServerConnection
        {
            Id = "new-id",
            Name = connectionDto.Name,
            Host = connectionDto.Host
        };

        _mockConnectionManager.Setup(x => x.AddConnectionAsync(connectionDto)).ReturnsAsync(createdConnection);

        // Act
        var result = await _controller.AddConnection(connectionDto);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(nameof(ServersController.GetConnection), createdResult.ActionName);
        Assert.Equal("new-id", createdResult.RouteValues?["id"]);
    }

    [Fact]
    public async Task UpdateConnection_WithValidData_ReturnsOk()
    {
        // Arrange
        var connectionId = "test-id";
        var connectionDto = new ServerConnectionDto { Name = "Updated Server" };
        var updatedConnection = new ServerConnection { Id = connectionId, Name = "Updated Server" };

        _mockConnectionManager.Setup(x => x.UpdateConnectionAsync(connectionId, connectionDto))
            .ReturnsAsync(updatedConnection);

        // Act
        var result = await _controller.UpdateConnection(connectionId, connectionDto);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var connection = Assert.IsType<ServerConnection>(okResult.Value);
        Assert.Equal("Updated Server", connection.Name);
    }

    [Fact]
    public async Task UpdateConnection_WithInvalidId_ReturnsNotFound()
    {
        // Arrange
        var connectionId = "invalid-id";
        var connectionDto = new ServerConnectionDto { Name = "Updated Server" };

        _mockConnectionManager.Setup(x => x.UpdateConnectionAsync(connectionId, connectionDto))
            .ReturnsAsync((ServerConnection?)null);

        // Act
        var result = await _controller.UpdateConnection(connectionId, connectionDto);

        // Assert
        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task DeleteConnection_WithValidId_ReturnsNoContent()
    {
        // Arrange
        var connectionId = "test-id";
        _mockConnectionManager.Setup(x => x.DeleteConnectionAsync(connectionId)).ReturnsAsync(true);

        // Act
        var result = await _controller.DeleteConnection(connectionId);

        // Assert
        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task DeleteConnection_WithInvalidId_ReturnsNotFound()
    {
        // Arrange
        var connectionId = "invalid-id";
        _mockConnectionManager.Setup(x => x.DeleteConnectionAsync(connectionId)).ReturnsAsync(false);

        // Act
        var result = await _controller.DeleteConnection(connectionId);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task TestConnection_WithValidId_ReturnsOkWithResult()
    {
        // Arrange
        var connectionId = "test-id";
        _mockConnectionManager.Setup(x => x.TestConnectionAsync(connectionId)).ReturnsAsync(true);

        // Act
        var result = await _controller.TestConnection(connectionId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.True((bool)okResult.Value!);
    }

    [Fact]
    public async Task TestNewConnection_WithValidData_ReturnsOkWithResult()
    {
        // Arrange
        var connectionDto = new ServerConnectionDto
        {
            Host = "192.168.1.1",
            Username = "test"
        };

        _mockConnectionManager.Setup(x => x.TestConnectionAsync(connectionDto)).ReturnsAsync(true);

        // Act
        var result = await _controller.TestNewConnection(connectionDto);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.True((bool)okResult.Value!);
    }
}
