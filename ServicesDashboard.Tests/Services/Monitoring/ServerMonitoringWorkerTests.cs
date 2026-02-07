using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using ServicesDashboard.Data;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Hubs;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Monitoring;
using ServicesDashboard.Services.Servers;
using ServicesDashboard.Services.Settings;
using Xunit;

namespace ServicesDashboard.Tests.Services.Monitoring;

public class ServerMonitoringWorkerTests
{
    private readonly Mock<ILogger<ServerMonitoringWorker>> _mockLogger;
    private readonly Mock<IHubContext<DiscoveryNotificationHub, IDiscoveryNotificationClient>> _mockHubContext;
    private readonly Mock<IDiscoveryNotificationClient> _mockClients;
    private readonly Mock<IServerManagementService> _mockServerService;
    private readonly Mock<ISettingsService> _mockSettingsService;

    public ServerMonitoringWorkerTests()
    {
        _mockLogger = new Mock<ILogger<ServerMonitoringWorker>>();
        _mockHubContext = new Mock<IHubContext<DiscoveryNotificationHub, IDiscoveryNotificationClient>>();
        _mockClients = new Mock<IDiscoveryNotificationClient>();
        _mockServerService = new Mock<IServerManagementService>();
        _mockSettingsService = new Mock<ISettingsService>();

        // Setup hub context to return mock clients
        var mockHubClients = new Mock<IHubClients<IDiscoveryNotificationClient>>();
        mockHubClients.Setup(c => c.All).Returns(_mockClients.Object);
        _mockHubContext.Setup(h => h.Clients).Returns(mockHubClients.Object);
    }

    private ServicesDashboardContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<ServicesDashboardContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;
        return new ServicesDashboardContext(options);
    }

    private IServiceProvider CreateServiceProvider(string dbName)
    {
        var services = new ServiceCollection();
        services.AddDbContext<ServicesDashboardContext>(options =>
            options.UseInMemoryDatabase(dbName));
        services.AddScoped<IServerManagementService>(_ => _mockServerService.Object);
        services.AddScoped<ISettingsService>(_ => _mockSettingsService.Object);
        return services.BuildServiceProvider();
    }

    [Fact]
    public async Task ConnectivityCheck_UpdatesServerStatus_AndBroadcastsViaSignalR()
    {
        // Arrange
        var dbName = $"test_connectivity_{Guid.NewGuid()}";
        var serviceProvider = CreateServiceProvider(dbName);

        using (var scope = serviceProvider.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();
            context.ManagedServers.Add(new ManagedServer
            {
                Id = 1,
                Name = "TestServer",
                HostAddress = "192.168.1.100",
                Status = ServerStatus.Unknown,
            });
            await context.SaveChangesAsync();
        }

        _mockServerService
            .Setup(s => s.TestConnectionAsync(It.IsAny<ManagedServer>()))
            .ReturnsAsync(true);

        _mockSettingsService
            .Setup(s => s.GetSettingsAsync<ServerMonitoringSettings>())
            .ReturnsAsync(new ServerMonitoringSettings
            {
                EnableAutoMonitoring = true,
                EnableHealthChecks = false,
                MonitoringIntervalMinutes = 5,
            });

        _mockClients
            .Setup(c => c.ReceiveServerStatusUpdate(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        var worker = new ServerMonitoringWorker(serviceProvider, _mockLogger.Object, _mockHubContext.Object);

        // Act - run one cycle by cancelling after a short delay
        var cts = new CancellationTokenSource(TimeSpan.FromSeconds(25));
        try { await worker.StartAsync(cts.Token); await Task.Delay(26000); }
        catch (OperationCanceledException) { }
        finally { await worker.StopAsync(CancellationToken.None); }

        // Assert - SignalR broadcast was called
        _mockClients.Verify(
            c => c.ReceiveServerStatusUpdate(1, "Online", It.IsAny<string>()),
            Times.AtLeastOnce());
    }

    [Fact]
    public async Task ConnectivityCheck_MarksServerOffline_WhenConnectionFails()
    {
        // Arrange
        var dbName = $"test_offline_{Guid.NewGuid()}";
        var serviceProvider = CreateServiceProvider(dbName);

        using (var scope = serviceProvider.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();
            context.ManagedServers.Add(new ManagedServer
            {
                Id = 1,
                Name = "FailServer",
                HostAddress = "10.0.0.1",
                Status = ServerStatus.Online,
            });
            await context.SaveChangesAsync();
        }

        _mockServerService
            .Setup(s => s.TestConnectionAsync(It.IsAny<ManagedServer>()))
            .ReturnsAsync(false);

        _mockSettingsService
            .Setup(s => s.GetSettingsAsync<ServerMonitoringSettings>())
            .ReturnsAsync(new ServerMonitoringSettings
            {
                EnableAutoMonitoring = true,
                EnableHealthChecks = false,
            });

        _mockClients
            .Setup(c => c.ReceiveServerStatusUpdate(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        var worker = new ServerMonitoringWorker(serviceProvider, _mockLogger.Object, _mockHubContext.Object);

        var cts = new CancellationTokenSource(TimeSpan.FromSeconds(25));
        try { await worker.StartAsync(cts.Token); await Task.Delay(26000); }
        catch (OperationCanceledException) { }
        finally { await worker.StopAsync(CancellationToken.None); }

        // Assert
        _mockClients.Verify(
            c => c.ReceiveServerStatusUpdate(1, "Offline", It.IsAny<string>()),
            Times.AtLeastOnce());
    }

    [Fact]
    public async Task Worker_DoesNotRun_WhenAutoMonitoringDisabled()
    {
        // Arrange
        var dbName = $"test_disabled_{Guid.NewGuid()}";
        var serviceProvider = CreateServiceProvider(dbName);

        _mockSettingsService
            .Setup(s => s.GetSettingsAsync<ServerMonitoringSettings>())
            .ReturnsAsync(new ServerMonitoringSettings
            {
                EnableAutoMonitoring = false,
            });

        var worker = new ServerMonitoringWorker(serviceProvider, _mockLogger.Object, _mockHubContext.Object);

        var cts = new CancellationTokenSource(TimeSpan.FromSeconds(25));
        try { await worker.StartAsync(cts.Token); await Task.Delay(26000); }
        catch (OperationCanceledException) { }
        finally { await worker.StopAsync(CancellationToken.None); }

        // Assert - no connectivity or health checks should have been made
        _mockServerService.Verify(
            s => s.TestConnectionAsync(It.IsAny<ManagedServer>()),
            Times.Never());

        _mockServerService.Verify(
            s => s.PerformHealthCheckAsync(It.IsAny<int>()),
            Times.Never());
    }

    [Fact]
    public async Task HealthCheck_BroadcastsViaSignalR_WhenEnabled()
    {
        // Arrange
        var dbName = $"test_health_{Guid.NewGuid()}";
        var serviceProvider = CreateServiceProvider(dbName);

        using (var scope = serviceProvider.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();
            context.ManagedServers.Add(new ManagedServer
            {
                Id = 1,
                Name = "HealthServer",
                HostAddress = "192.168.1.50",
                Status = ServerStatus.Online,
            });
            await context.SaveChangesAsync();
        }

        _mockServerService
            .Setup(s => s.TestConnectionAsync(It.IsAny<ManagedServer>()))
            .ReturnsAsync(true);

        var healthCheck = new ServerHealthCheck
        {
            Id = 1,
            ServerId = 1,
            CheckTime = DateTime.UtcNow,
            IsHealthy = true,
            CpuUsage = 45,
            MemoryUsage = 60,
            DiskUsage = 70,
        };

        _mockServerService
            .Setup(s => s.PerformHealthCheckAsync(1))
            .ReturnsAsync(healthCheck);

        _mockSettingsService
            .Setup(s => s.GetSettingsAsync<ServerMonitoringSettings>())
            .ReturnsAsync(new ServerMonitoringSettings
            {
                EnableAutoMonitoring = true,
                EnableHealthChecks = true,
                MonitoringIntervalMinutes = 1, // Use smallest interval to trigger health check
            });

        _mockClients
            .Setup(c => c.ReceiveServerStatusUpdate(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);
        _mockClients
            .Setup(c => c.ReceiveServerHealthUpdate(It.IsAny<int>(), It.IsAny<object>()))
            .Returns(Task.CompletedTask);

        var worker = new ServerMonitoringWorker(serviceProvider, _mockLogger.Object, _mockHubContext.Object);

        var cts = new CancellationTokenSource(TimeSpan.FromSeconds(25));
        try { await worker.StartAsync(cts.Token); await Task.Delay(26000); }
        catch (OperationCanceledException) { }
        finally { await worker.StopAsync(CancellationToken.None); }

        // Assert - health check was performed and broadcast
        _mockServerService.Verify(
            s => s.PerformHealthCheckAsync(1),
            Times.AtLeastOnce());

        _mockClients.Verify(
            c => c.ReceiveServerHealthUpdate(1, It.IsAny<object>()),
            Times.AtLeastOnce());
    }

    [Fact]
    public async Task Worker_DoesNotCrash_WhenNoServersExist()
    {
        // Arrange
        var dbName = $"test_empty_{Guid.NewGuid()}";
        var serviceProvider = CreateServiceProvider(dbName);

        _mockSettingsService
            .Setup(s => s.GetSettingsAsync<ServerMonitoringSettings>())
            .ReturnsAsync(new ServerMonitoringSettings
            {
                EnableAutoMonitoring = true,
                EnableHealthChecks = true,
            });

        var worker = new ServerMonitoringWorker(serviceProvider, _mockLogger.Object, _mockHubContext.Object);

        // Act & Assert - should not throw
        var cts = new CancellationTokenSource(TimeSpan.FromSeconds(25));
        try { await worker.StartAsync(cts.Token); await Task.Delay(26000); }
        catch (OperationCanceledException) { }
        finally { await worker.StopAsync(CancellationToken.None); }

        // No crashes, no connection tests attempted
        _mockServerService.Verify(
            s => s.TestConnectionAsync(It.IsAny<ManagedServer>()),
            Times.Never());
    }

    [Fact]
    public async Task ConnectivityCheck_HandlesExceptions_Gracefully()
    {
        // Arrange
        var dbName = $"test_exception_{Guid.NewGuid()}";
        var serviceProvider = CreateServiceProvider(dbName);

        using (var scope = serviceProvider.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();
            context.ManagedServers.Add(new ManagedServer
            {
                Id = 1,
                Name = "ErrorServer",
                HostAddress = "192.168.1.1",
                Status = ServerStatus.Online,
            });
            await context.SaveChangesAsync();
        }

        _mockServerService
            .Setup(s => s.TestConnectionAsync(It.IsAny<ManagedServer>()))
            .ThrowsAsync(new Exception("SSH connection timeout"));

        _mockSettingsService
            .Setup(s => s.GetSettingsAsync<ServerMonitoringSettings>())
            .ReturnsAsync(new ServerMonitoringSettings
            {
                EnableAutoMonitoring = true,
                EnableHealthChecks = false,
            });

        _mockClients
            .Setup(c => c.ReceiveServerStatusUpdate(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        var worker = new ServerMonitoringWorker(serviceProvider, _mockLogger.Object, _mockHubContext.Object);

        // Act & Assert - should not crash
        var cts = new CancellationTokenSource(TimeSpan.FromSeconds(25));
        try { await worker.StartAsync(cts.Token); await Task.Delay(26000); }
        catch (OperationCanceledException) { }
        finally { await worker.StopAsync(CancellationToken.None); }

        // Should broadcast Offline status after exception
        _mockClients.Verify(
            c => c.ReceiveServerStatusUpdate(1, "Offline", It.IsAny<string>()),
            Times.AtLeastOnce());
    }
}
