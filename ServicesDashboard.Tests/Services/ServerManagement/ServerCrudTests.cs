using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using OllamaSharp;
using ServicesDashboard.Data;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Servers;
using Xunit;

namespace ServicesDashboard.Tests.Services.ServerManagement;

/// <summary>
/// Tests for server CRUD operations: Add, Get, Update, Delete.
/// Uses an in-memory database and mocks external dependencies (Ollama, SSH)
/// to isolate data-access logic from network dependencies.
/// </summary>
public class ServerCrudTests
{
    private readonly Mock<ILogger<ServicesDashboard.Services.Servers.ServerManagement>> _mockLogger;
    private readonly Mock<IOllamaApiClient> _mockOllama;
    private readonly IOptions<AppSettings> _settings;

    public ServerCrudTests()
    {
        _mockLogger = new Mock<ILogger<ServicesDashboard.Services.Servers.ServerManagement>>();
        _mockOllama = new Mock<IOllamaApiClient>();
        _settings = Options.Create(new AppSettings());
    }

    private ServicesDashboardContext CreateContext(string dbName)
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
        return services.BuildServiceProvider();
    }

    private ServicesDashboard.Services.Servers.ServerManagement CreateService(
        ServicesDashboardContext context, IServiceProvider serviceProvider)
    {
        return new ServicesDashboard.Services.Servers.ServerManagement(
            context,
            _mockLogger.Object,
            _mockOllama.Object,
            _settings,
            serviceProvider
        );
    }

    private static ManagedServer MakeServer(string name = "TestServer", string host = "192.168.1.100")
    {
        return new ManagedServer
        {
            Name = name,
            HostAddress = host,
            SshPort = 22,
            Username = "root",
            EncryptedPassword = "testpass",
            Type = ServerType.Server,
            Group = ServerGroup.Remote,
            Status = ServerStatus.Unknown,
        };
    }

    // ── Add ──────────────────────────────────────────────

    [Fact]
    public async Task AddServer_PersistsToDatabase()
    {
        var dbName = $"crud_add_{Guid.NewGuid()}";
        var sp = CreateServiceProvider(dbName);
        using var context = CreateContext(dbName);
        var service = CreateService(context, sp);

        var server = MakeServer();
        var result = await service.AddServerAsync(server);

        Assert.True(result.Id > 0);
        Assert.Equal("TestServer", result.Name);

        var fromDb = await context.ManagedServers.FindAsync(result.Id);
        Assert.NotNull(fromDb);
        Assert.Equal("192.168.1.100", fromDb!.HostAddress);
    }

    [Fact]
    public async Task AddServer_SetsCreatedAndUpdatedTimestamps()
    {
        var dbName = $"crud_add_ts_{Guid.NewGuid()}";
        var sp = CreateServiceProvider(dbName);
        using var context = CreateContext(dbName);
        var service = CreateService(context, sp);

        var before = DateTime.UtcNow.AddSeconds(-1);
        var result = await service.AddServerAsync(MakeServer());
        var after = DateTime.UtcNow.AddSeconds(1);

        Assert.InRange(result.CreatedAt, before, after);
        Assert.InRange(result.UpdatedAt, before, after);
    }

    [Fact]
    public async Task AddServer_EncryptsPassword()
    {
        var dbName = $"crud_add_enc_{Guid.NewGuid()}";
        var sp = CreateServiceProvider(dbName);
        using var context = CreateContext(dbName);
        var service = CreateService(context, sp);

        var server = MakeServer();
        server.EncryptedPassword = "plaintext123";
        var result = await service.AddServerAsync(server);

        var fromDb = await context.ManagedServers.FindAsync(result.Id);
        Assert.NotNull(fromDb);
        Assert.NotEqual("plaintext123", fromDb!.EncryptedPassword);
        Assert.False(string.IsNullOrEmpty(fromDb.EncryptedPassword));
    }

    [Fact]
    public async Task AddServer_RejectsDuplicateHostAddress()
    {
        var dbName = $"crud_add_dup_{Guid.NewGuid()}";
        var sp = CreateServiceProvider(dbName);
        using var context = CreateContext(dbName);
        var service = CreateService(context, sp);

        await service.AddServerAsync(MakeServer("Server1", "10.0.0.1"));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.AddServerAsync(MakeServer("Server2", "10.0.0.1")));

        Assert.Contains("already exists", ex.Message);
    }

    [Fact]
    public async Task AddServer_SetsStatusOffline_WhenConnectionFails()
    {
        var dbName = $"crud_add_offline_{Guid.NewGuid()}";
        var sp = CreateServiceProvider(dbName);
        using var context = CreateContext(dbName);
        var service = CreateService(context, sp);

        // Use unreachable address — connection will fail in test environment
        var server = MakeServer("Unreachable", "240.0.0.1");
        var result = await service.AddServerAsync(server);

        Assert.Equal(ServerStatus.Offline, result.Status);
    }

    [Fact]
    public async Task AddServer_StoresSshCredentialId()
    {
        var dbName = $"crud_credid_{Guid.NewGuid()}";
        var sp = CreateServiceProvider(dbName);
        using var context = CreateContext(dbName);
        var service = CreateService(context, sp);

        var server = MakeServer();
        server.SshCredentialId = 42;
        var result = await service.AddServerAsync(server);

        var fromDb = await context.ManagedServers.FindAsync(result.Id);
        Assert.NotNull(fromDb);
        Assert.Equal(42, fromDb!.SshCredentialId);
    }

    // ── Get ──────────────────────────────────────────────

    [Fact]
    public async Task GetServer_ReturnsServer_WhenExists()
    {
        var dbName = $"crud_get_{Guid.NewGuid()}";
        var sp = CreateServiceProvider(dbName);
        using var context = CreateContext(dbName);
        var service = CreateService(context, sp);

        var added = await service.AddServerAsync(MakeServer());
        var result = await service.GetServerAsync(added.Id);

        Assert.NotNull(result);
        Assert.Equal(added.Id, result!.Id);
        Assert.Equal("TestServer", result.Name);
    }

    [Fact]
    public async Task GetServer_ReturnsNull_WhenNotFound()
    {
        var dbName = $"crud_get_null_{Guid.NewGuid()}";
        var sp = CreateServiceProvider(dbName);
        using var context = CreateContext(dbName);
        var service = CreateService(context, sp);

        var result = await service.GetServerAsync(999);
        Assert.Null(result);
    }

    [Fact]
    public async Task GetServers_ReturnsAll()
    {
        var dbName = $"crud_getall_{Guid.NewGuid()}";
        var sp = CreateServiceProvider(dbName);
        using var context = CreateContext(dbName);
        var service = CreateService(context, sp);

        await service.AddServerAsync(MakeServer("A", "10.0.0.1"));
        await service.AddServerAsync(MakeServer("B", "10.0.0.2"));
        await service.AddServerAsync(MakeServer("C", "10.0.0.3"));

        var servers = (await service.GetServersAsync()).ToList();
        Assert.Equal(3, servers.Count);
    }

    // ── Update ───────────────────────────────────────────

    [Fact]
    public async Task UpdateServer_ChangesName()
    {
        var dbName = $"crud_upd_name_{Guid.NewGuid()}";
        var sp = CreateServiceProvider(dbName);
        using var context = CreateContext(dbName);
        var service = CreateService(context, sp);

        var added = await service.AddServerAsync(MakeServer());

        var toUpdate = new ManagedServer
        {
            Id = added.Id,
            Name = "UpdatedName",
            HostAddress = added.HostAddress,
            SshPort = added.SshPort,
            Username = added.Username,
            Type = added.Type,
            Group = added.Group,
        };

        var result = await service.UpdateServerAsync(toUpdate);
        Assert.Equal("UpdatedName", result.Name);

        var fromDb = await context.ManagedServers.FindAsync(added.Id);
        Assert.Equal("UpdatedName", fromDb!.Name);
    }

    [Fact]
    public async Task UpdateServer_ChangesHostAddress()
    {
        var dbName = $"crud_upd_host_{Guid.NewGuid()}";
        var sp = CreateServiceProvider(dbName);
        using var context = CreateContext(dbName);
        var service = CreateService(context, sp);

        var added = await service.AddServerAsync(MakeServer());

        var toUpdate = new ManagedServer
        {
            Id = added.Id,
            Name = added.Name,
            HostAddress = "10.10.10.10",
            SshPort = added.SshPort,
            Username = added.Username,
            Type = added.Type,
            Group = added.Group,
        };

        var result = await service.UpdateServerAsync(toUpdate);
        Assert.Equal("10.10.10.10", result.HostAddress);
    }

    [Fact]
    public async Task UpdateServer_UpdatesPassword_WhenChanged()
    {
        var dbName = $"crud_upd_pw_{Guid.NewGuid()}";
        var sp = CreateServiceProvider(dbName);
        using var context = CreateContext(dbName);
        var service = CreateService(context, sp);

        var added = await service.AddServerAsync(MakeServer());
        var originalPassword = (await context.ManagedServers.FindAsync(added.Id))!.EncryptedPassword;

        var toUpdate = new ManagedServer
        {
            Id = added.Id,
            Name = added.Name,
            HostAddress = added.HostAddress,
            SshPort = added.SshPort,
            Username = added.Username,
            EncryptedPassword = "newpassword456",
            Type = added.Type,
            Group = added.Group,
        };

        await service.UpdateServerAsync(toUpdate);

        var fromDb = await context.ManagedServers.FindAsync(added.Id);
        Assert.NotEqual(originalPassword, fromDb!.EncryptedPassword);
        Assert.NotEqual("newpassword456", fromDb.EncryptedPassword);
    }

    [Fact]
    public async Task UpdateServer_PreservesPassword_WhenNotProvided()
    {
        var dbName = $"crud_upd_nopw_{Guid.NewGuid()}";
        var sp = CreateServiceProvider(dbName);
        using var context = CreateContext(dbName);
        var service = CreateService(context, sp);

        var added = await service.AddServerAsync(MakeServer());
        var originalPassword = (await context.ManagedServers.FindAsync(added.Id))!.EncryptedPassword;

        var toUpdate = new ManagedServer
        {
            Id = added.Id,
            Name = "Renamed",
            HostAddress = added.HostAddress,
            SshPort = added.SshPort,
            Username = added.Username,
            EncryptedPassword = null,
            Type = added.Type,
            Group = added.Group,
        };

        await service.UpdateServerAsync(toUpdate);

        var fromDb = await context.ManagedServers.FindAsync(added.Id);
        Assert.Equal(originalPassword, fromDb!.EncryptedPassword);
    }

    [Fact]
    public async Task UpdateServer_UpdatesTimestamp()
    {
        var dbName = $"crud_upd_ts_{Guid.NewGuid()}";
        var sp = CreateServiceProvider(dbName);
        using var context = CreateContext(dbName);
        var service = CreateService(context, sp);

        var added = await service.AddServerAsync(MakeServer());
        var originalUpdatedAt = added.UpdatedAt;

        await Task.Delay(50);

        var toUpdate = new ManagedServer
        {
            Id = added.Id,
            Name = "Renamed",
            HostAddress = added.HostAddress,
            SshPort = added.SshPort,
            Username = added.Username,
            Type = added.Type,
            Group = added.Group,
        };

        var result = await service.UpdateServerAsync(toUpdate);
        Assert.True(result.UpdatedAt >= originalUpdatedAt);
    }

    [Fact]
    public async Task UpdateServer_ThrowsForNonExistent()
    {
        var dbName = $"crud_upd_404_{Guid.NewGuid()}";
        var sp = CreateServiceProvider(dbName);
        using var context = CreateContext(dbName);
        var service = CreateService(context, sp);

        var toUpdate = new ManagedServer
        {
            Id = 999,
            Name = "Ghost",
            HostAddress = "1.2.3.4",
        };

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.UpdateServerAsync(toUpdate));
    }

    // ── Delete ───────────────────────────────────────────

    [Fact]
    public async Task DeleteServer_RemovesFromDatabase()
    {
        var dbName = $"crud_del_{Guid.NewGuid()}";
        var sp = CreateServiceProvider(dbName);
        using var context = CreateContext(dbName);
        var service = CreateService(context, sp);

        var added = await service.AddServerAsync(MakeServer());

        var deleted = await service.DeleteServerAsync(added.Id);
        Assert.True(deleted);

        var fromDb = await context.ManagedServers.FindAsync(added.Id);
        Assert.Null(fromDb);
    }

    [Fact]
    public async Task DeleteServer_ReturnsFalse_WhenNotFound()
    {
        var dbName = $"crud_del_404_{Guid.NewGuid()}";
        var sp = CreateServiceProvider(dbName);
        using var context = CreateContext(dbName);
        var service = CreateService(context, sp);

        var deleted = await service.DeleteServerAsync(999);
        Assert.False(deleted);
    }

    [Fact]
    public async Task DeleteServer_ReducesCount()
    {
        var dbName = $"crud_del_count_{Guid.NewGuid()}";
        var sp = CreateServiceProvider(dbName);
        using var context = CreateContext(dbName);
        var service = CreateService(context, sp);

        var s1 = await service.AddServerAsync(MakeServer("A", "10.0.0.1"));
        await service.AddServerAsync(MakeServer("B", "10.0.0.2"));

        Assert.Equal(2, (await service.GetServersAsync()).Count());

        await service.DeleteServerAsync(s1.Id);

        var remaining = (await service.GetServersAsync()).ToList();
        Assert.Single(remaining);
        Assert.Equal("B", remaining[0].Name);
    }

    [Fact]
    public async Task DeleteServer_ThenGetReturnsNull()
    {
        var dbName = $"crud_del_get_{Guid.NewGuid()}";
        var sp = CreateServiceProvider(dbName);
        using var context = CreateContext(dbName);
        var service = CreateService(context, sp);

        var added = await service.AddServerAsync(MakeServer());
        await service.DeleteServerAsync(added.Id);

        var result = await service.GetServerAsync(added.Id);
        Assert.Null(result);
    }

    // ── Host address uniqueness ──────────────────────────

    [Fact]
    public async Task IsHostAddressAvailable_ReturnsFalse_WhenTaken()
    {
        var dbName = $"crud_host_taken_{Guid.NewGuid()}";
        var sp = CreateServiceProvider(dbName);
        using var context = CreateContext(dbName);
        var service = CreateService(context, sp);

        await service.AddServerAsync(MakeServer("Existing", "10.0.0.50"));

        var available = await service.IsHostAddressAvailableAsync("10.0.0.50");
        Assert.False(available);
    }

    [Fact]
    public async Task IsHostAddressAvailable_ReturnsTrue_WhenFree()
    {
        var dbName = $"crud_host_free_{Guid.NewGuid()}";
        var sp = CreateServiceProvider(dbName);
        using var context = CreateContext(dbName);
        var service = CreateService(context, sp);

        var available = await service.IsHostAddressAvailableAsync("10.0.0.99");
        Assert.True(available);
    }

    [Fact]
    public async Task IsHostAddressAvailable_ReturnsTrue_AfterServerDeleted()
    {
        var dbName = $"crud_host_freed_{Guid.NewGuid()}";
        var sp = CreateServiceProvider(dbName);
        using var context = CreateContext(dbName);
        var service = CreateService(context, sp);

        var added = await service.AddServerAsync(MakeServer("Temp", "10.0.0.77"));
        await service.DeleteServerAsync(added.Id);

        var available = await service.IsHostAddressAvailableAsync("10.0.0.77");
        Assert.True(available);
    }
}
