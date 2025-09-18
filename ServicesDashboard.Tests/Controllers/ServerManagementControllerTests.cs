using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using ServicesDashboard.Controllers;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Requests;
using ServicesDashboard.Models.Results;
using ServicesDashboard.Services.Servers;
using Xunit;

namespace ServicesDashboard.Tests.Controllers;

public class ServerManagementControllerTests
{
    private readonly Mock<IServerManagementService> _mockServerManagementService;
    private readonly Mock<ILogger<ServerManagementController>> _mockLogger;
    private readonly ServerManagementController _controller;

    public ServerManagementControllerTests()
    {
        _mockServerManagementService = new Mock<IServerManagementService>();
        _mockLogger = new Mock<ILogger<ServerManagementController>>();
        _controller = new ServerManagementController(
            _mockServerManagementService.Object,
            _mockLogger.Object);
    }

    [Fact]
    public async Task GetServers_ReturnsOkWithServersList()
    {
        // Arrange
        var expectedServers = new List<ManagedServer>
        {
            new ManagedServer { Id = 1, Name = "Server 1", HostAddress = "192.168.1.1", Type = ServerType.Server },
            new ManagedServer { Id = 2, Name = "Server 2", HostAddress = "192.168.1.2", Type = ServerType.VirtualMachine }
        };

        _mockServerManagementService.Setup(x => x.GetServersAsync())
            .ReturnsAsync(expectedServers);

        // Act
        var result = await _controller.GetServers();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var servers = Assert.IsAssignableFrom<IEnumerable<ManagedServer>>(okResult.Value);
        Assert.Equal(2, servers.Count());
    }

    [Fact]
    public async Task GetServers_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        _mockServerManagementService.Setup(x => x.GetServersAsync())
            .ThrowsAsync(new Exception("Database connection failed"));

        // Act
        var result = await _controller.GetServers();

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(500, statusResult.StatusCode);
        Assert.Equal("Internal server error", statusResult.Value);
    }

    [Fact]
    public async Task GetServer_WithValidId_ReturnsOkWithServer()
    {
        // Arrange
        var serverId = 1;
        var expectedServer = new ManagedServer 
        { 
            Id = serverId, 
            Name = "Test Server", 
            HostAddress = "192.168.1.1", 
            Type = ServerType.Server 
        };

        _mockServerManagementService.Setup(x => x.GetServerAsync(serverId))
            .ReturnsAsync(expectedServer);

        // Act
        var result = await _controller.GetServer(serverId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var server = Assert.IsType<ManagedServer>(okResult.Value);
        Assert.Equal(serverId, server.Id);
        Assert.Equal("Test Server", server.Name);
    }

    [Fact]
    public async Task GetServer_WithInvalidId_ReturnsNotFound()
    {
        // Arrange
        var serverId = 999;
        _mockServerManagementService.Setup(x => x.GetServerAsync(serverId))
            .ReturnsAsync((ManagedServer?)null);

        // Act
        var result = await _controller.GetServer(serverId);

        // Assert
        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetServer_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var serverId = 1;
        _mockServerManagementService.Setup(x => x.GetServerAsync(serverId))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _controller.GetServer(serverId);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(500, statusResult.StatusCode);
        Assert.Equal("Internal server error", statusResult.Value);
    }

    [Fact]
    public async Task AddServer_WithValidRequest_ReturnsCreatedAtAction()
    {
        // Arrange
        var request = new CreateUpdateServerRequest
        {
            Name = "New Server",
            HostAddress = "192.168.1.10",
            SshPort = 22,
            Username = "admin",
            Password = "password",
            Type = "Server",
            Tags = "production,web"
        };

        var addedServer = new ManagedServer
        {
            Id = 1,
            Name = request.Name,
            HostAddress = request.HostAddress,
            SshPort = request.SshPort,
            Username = request.Username,
            Type = ServerType.Server,
            Tags = request.Tags
        };

        _mockServerManagementService.Setup(x => x.AddServerAsync(It.IsAny<ManagedServer>()))
            .ReturnsAsync(addedServer);

        // Act
        var result = await _controller.AddServer(request);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(nameof(ServerManagementController.GetServer), createdResult.ActionName);
        Assert.Equal(addedServer.Id, createdResult.RouteValues?["id"]);

        var server = Assert.IsType<ManagedServer>(createdResult.Value);
        Assert.Equal(request.Name, server.Name);
        Assert.Equal(request.HostAddress, server.HostAddress);
    }

    [Fact]
    public async Task AddServer_WithDuplicateServer_ReturnsBadRequest()
    {
        // Arrange
        var request = new CreateUpdateServerRequest
        {
            Name = "Duplicate Server",
            HostAddress = "192.168.1.1"
        };

        var duplicateException = new InvalidOperationException("Server already exists with this host address");
        _mockServerManagementService.Setup(x => x.AddServerAsync(It.IsAny<ManagedServer>()))
            .ThrowsAsync(duplicateException);

        // Act
        var result = await _controller.AddServer(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.NotNull(badRequestResult.Value);
    }

    [Fact]
    public async Task AddServer_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var request = new CreateUpdateServerRequest
        {
            Name = "Server",
            HostAddress = "192.168.1.1"
        };

        _mockServerManagementService.Setup(x => x.AddServerAsync(It.IsAny<ManagedServer>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _controller.AddServer(request);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(500, statusResult.StatusCode);
        Assert.Equal("Internal server error", statusResult.Value);
    }

    [Fact]
    public async Task UpdateServer_WithValidRequest_ReturnsOkWithUpdatedServer()
    {
        // Arrange
        var serverId = 1;
        var request = new CreateUpdateServerRequest
        {
            Name = "Updated Server",
            HostAddress = "192.168.1.100",
            SshPort = 2222,
            Username = "newadmin"
        };

        var existingServer = new ManagedServer
        {
            Id = serverId,
            Name = "Old Server",
            HostAddress = "192.168.1.1",
            SshPort = 22,
            Username = "admin",
            Type = ServerType.Server
        };

        var updatedServer = new ManagedServer
        {
            Id = serverId,
            Name = request.Name,
            HostAddress = request.HostAddress,
            SshPort = request.SshPort,
            Username = request.Username,
            Type = ServerType.Server
        };

        _mockServerManagementService.Setup(x => x.GetServerAsync(serverId))
            .ReturnsAsync(existingServer);
        _mockServerManagementService.Setup(x => x.IsHostAddressAvailableAsync(request.HostAddress))
            .ReturnsAsync(true);
        _mockServerManagementService.Setup(x => x.UpdateServerAsync(It.IsAny<ManagedServer>()))
            .ReturnsAsync(updatedServer);

        // Act
        var result = await _controller.UpdateServer(serverId, request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var server = Assert.IsType<ManagedServer>(okResult.Value);
        Assert.Equal(request.Name, server.Name);
        Assert.Equal(request.HostAddress, server.HostAddress);
    }

    [Fact]
    public async Task UpdateServer_WithNonExistentServer_ReturnsNotFound()
    {
        // Arrange
        var serverId = 999;
        var request = new CreateUpdateServerRequest { Name = "Server" };

        _mockServerManagementService.Setup(x => x.GetServerAsync(serverId))
            .ReturnsAsync((ManagedServer?)null);

        // Act
        var result = await _controller.UpdateServer(serverId, request);

        // Assert
        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task UpdateServer_WithDuplicateHostAddress_ReturnsBadRequest()
    {
        // Arrange
        var serverId = 1;
        var request = new CreateUpdateServerRequest
        {
            Name = "Server",
            HostAddress = "192.168.1.100"
        };

        var existingServer = new ManagedServer
        {
            Id = serverId,
            Name = "Server",
            HostAddress = "192.168.1.1",
            Type = ServerType.Server
        };

        _mockServerManagementService.Setup(x => x.GetServerAsync(serverId))
            .ReturnsAsync(existingServer);
        _mockServerManagementService.Setup(x => x.IsHostAddressAvailableAsync(request.HostAddress))
            .ReturnsAsync(false);

        // Act
        var result = await _controller.UpdateServer(serverId, request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.NotNull(badRequestResult.Value);
    }

    [Theory]
    [InlineData("Server")]
    [InlineData("VirtualMachine")]
    [InlineData("Container")]
    [InlineData("RaspberryPi")]
    public async Task AddServer_WithDifferentServerTypes_CreatesCorrectType(string serverType)
    {
        // Arrange
        var request = new CreateUpdateServerRequest
        {
            Name = "Test Server",
            HostAddress = "192.168.1.1",
            Type = serverType
        };

        ManagedServer? capturedServer = null;
        _mockServerManagementService
            .Setup(x => x.AddServerAsync(It.IsAny<ManagedServer>()))
            .Callback<ManagedServer>(server => capturedServer = server)
            .ReturnsAsync(new ManagedServer { Id = 1 });

        // Act
        await _controller.AddServer(request);

        // Assert
        Assert.NotNull(capturedServer);
        Assert.Equal(Enum.Parse<ServerType>(serverType), capturedServer.Type);
    }

    [Fact]
    public async Task AddServer_WithInvalidServerType_DefaultsToServer()
    {
        // Arrange
        var request = new CreateUpdateServerRequest
        {
            Name = "Test Server",
            HostAddress = "192.168.1.1",
            Type = null // This should default to "Server"
        };

        ManagedServer? capturedServer = null;
        _mockServerManagementService
            .Setup(x => x.AddServerAsync(It.IsAny<ManagedServer>()))
            .Callback<ManagedServer>(server => capturedServer = server)
            .ReturnsAsync(new ManagedServer { Id = 1 });

        // Act
        await _controller.AddServer(request);

        // Assert
        Assert.NotNull(capturedServer);
        Assert.Equal(ServerType.Server, capturedServer.Type);
    }
}