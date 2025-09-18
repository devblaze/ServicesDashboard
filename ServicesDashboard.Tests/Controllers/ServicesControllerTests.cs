using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using ServicesDashboard.Controllers;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services;
using ServicesDashboard.Services.Servers;
using Xunit;

namespace ServicesDashboard.Tests.Controllers;

public class ServicesControllerTests
{
    private readonly Mock<IUserServices> _mockUserServices;
    private readonly Mock<ILogger<ServicesController>> _mockLogger;
    private readonly Mock<IServerManagementService> _mockServerManagementService;
    private readonly ServicesController _controller;

    public ServicesControllerTests()
    {
        _mockUserServices = new Mock<IUserServices>();
        _mockLogger = new Mock<ILogger<ServicesController>>();
        _mockServerManagementService = new Mock<IServerManagementService>();
        _controller = new ServicesController(
            _mockUserServices.Object, 
            _mockLogger.Object, 
            _mockServerManagementService.Object);
    }

    [Fact]
    public async Task GetAllServices_ReturnsOkWithServicesList()
    {
        // Arrange
        var expectedServices = new List<HostedService>
        {
            new HostedService { Id = Guid.NewGuid(), Name = "Service 1", Url = "http://test1.com" },
            new HostedService { Id = Guid.NewGuid(), Name = "Service 2", Url = "http://test2.com" }
        };

        _mockUserServices.Setup(x => x.GetAllServicesAsync()).ReturnsAsync(expectedServices);

        // Act
        var result = await _controller.GetAllServices();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var services = Assert.IsAssignableFrom<IEnumerable<HostedService>>(okResult.Value);
        Assert.Equal(2, services.Count());
    }

    [Fact]
    public async Task GetService_WithValidId_ReturnsOkWithService()
    {
        // Arrange
        var serviceId = Guid.NewGuid();
        var expectedService = new HostedService { Id = serviceId, Name = "Test Service", Url = "http://test.com" };
        _mockUserServices.Setup(x => x.GetServiceByIdAsync(serviceId)).ReturnsAsync(expectedService);

        // Act
        var result = await _controller.GetService(serviceId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var service = Assert.IsType<HostedService>(okResult.Value);
        Assert.Equal(serviceId, service.Id);
        Assert.Equal("Test Service", service.Name);
    }

    [Fact]
    public async Task GetService_WithInvalidId_ReturnsNotFound()
    {
        // Arrange
        var serviceId = Guid.NewGuid();
        _mockUserServices.Setup(x => x.GetServiceByIdAsync(serviceId)).ReturnsAsync((HostedService?)null);

        // Act
        var result = await _controller.GetService(serviceId);

        // Assert
        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task CreateService_WithValidService_ReturnsCreatedAtAction()
    {
        // Arrange
        var newService = new HostedService { Name = "New Service", Url = "http://new.com" };
        var createdService = new HostedService { Id = Guid.NewGuid(), Name = "New Service", Url = "http://new.com" };
        
        _mockUserServices.Setup(x => x.AddServiceAsync(It.IsAny<HostedService>())).ReturnsAsync(createdService);

        // Act
        var result = await _controller.CreateService(newService);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(nameof(ServicesController.GetService), createdResult.ActionName);
        Assert.Equal(createdService.Id, createdResult.RouteValues?["id"]);

        var service = Assert.IsType<HostedService>(createdResult.Value);
        Assert.Equal(createdService.Id, service.Id);
    }

    [Fact]
    public async Task UpdateService_WithValidData_ReturnsNoContent()
    {
        // Arrange
        var serviceId = Guid.NewGuid();
        var service = new HostedService { Id = serviceId, Name = "Updated Service", Url = "http://updated.com" };
        
        _mockUserServices.Setup(x => x.UpdateServiceAsync(service)).ReturnsAsync(true);

        // Act
        var result = await _controller.UpdateService(serviceId, service);

        // Assert
        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task UpdateService_WithMismatchedId_ReturnsBadRequest()
    {
        // Arrange
        var serviceId = Guid.NewGuid();
        var differentId = Guid.NewGuid();
        var service = new HostedService { Id = differentId, Name = "Service" };

        // Act
        var result = await _controller.UpdateService(serviceId, service);

        // Assert
        Assert.IsType<BadRequestResult>(result);
    }

    [Fact]
    public async Task UpdateService_WithNonExistentService_ReturnsNotFound()
    {
        // Arrange
        var serviceId = Guid.NewGuid();
        var service = new HostedService { Id = serviceId, Name = "Service" };
        
        _mockUserServices.Setup(x => x.UpdateServiceAsync(service)).ReturnsAsync(false);

        // Act
        var result = await _controller.UpdateService(serviceId, service);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task DeleteService_WithValidId_ReturnsNoContent()
    {
        // Arrange
        var serviceId = Guid.NewGuid();
        _mockUserServices.Setup(x => x.DeleteServiceAsync(serviceId)).ReturnsAsync(true);

        // Act
        var result = await _controller.DeleteService(serviceId);

        // Assert
        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task DeleteService_WithInvalidId_ReturnsNotFound()
    {
        // Arrange
        var serviceId = Guid.NewGuid();
        _mockUserServices.Setup(x => x.DeleteServiceAsync(serviceId)).ReturnsAsync(false);

        // Act
        var result = await _controller.DeleteService(serviceId);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task CheckServiceHealth_WithValidId_ReturnsNoContent()
    {
        // Arrange
        var serviceId = Guid.NewGuid();
        _mockUserServices.Setup(x => x.CheckServiceHealthAsync(serviceId)).ReturnsAsync(true);

        // Act
        var result = await _controller.CheckServiceHealth(serviceId);

        // Assert
        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task CheckServiceHealth_WithInvalidId_ReturnsNotFound()
    {
        // Arrange
        var serviceId = Guid.NewGuid();
        _mockUserServices.Setup(x => x.CheckServiceHealthAsync(serviceId)).ReturnsAsync(false);

        // Act
        var result = await _controller.CheckServiceHealth(serviceId);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task GetServersForServices_ReturnsOkWithServerSummaries()
    {
        // Arrange
        var servers = new List<ManagedServer>
        {
            new ManagedServer 
            { 
                Id = 1, 
                Name = "Server 1", 
                HostAddress = "192.168.1.1", 
                Status = ServerStatus.Online,
                Type = ServerType.Server,
                LastCheckTime = DateTime.UtcNow
            },
            new ManagedServer 
            { 
                Id = 2, 
                Name = "Server 2", 
                HostAddress = "192.168.1.2", 
                Status = ServerStatus.Offline,
                Type = ServerType.VirtualMachine,
                LastCheckTime = DateTime.UtcNow.AddMinutes(-5)
            }
        };

        _mockServerManagementService.Setup(x => x.GetServersAsync()).ReturnsAsync(servers);

        // Act
        var result = await _controller.GetServersForServices();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var serverSummaries = Assert.IsAssignableFrom<IEnumerable<ServerSummaryDto>>(okResult.Value);
        
        var summaryList = serverSummaries.ToList();
        Assert.Equal(2, summaryList.Count);
        Assert.Equal("Server 1", summaryList[0].Name);
        Assert.Equal("192.168.1.1", summaryList[0].HostAddress);
        Assert.Equal("Online", summaryList[0].Status);
        Assert.Equal("Server", summaryList[0].Type);
    }

    [Fact]
    public async Task GetServersForServices_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        _mockServerManagementService.Setup(x => x.GetServersAsync())
            .ThrowsAsync(new Exception("Database connection failed"));

        // Act
        var result = await _controller.GetServersForServices();

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(500, statusResult.StatusCode);
        Assert.Equal("Failed to retrieve servers", statusResult.Value);
    }
}