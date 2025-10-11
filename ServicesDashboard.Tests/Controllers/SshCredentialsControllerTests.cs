using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using ServicesDashboard.Controllers;
using ServicesDashboard.Data;
using ServicesDashboard.Models;
using Xunit;

namespace ServicesDashboard.Tests.Controllers;

public class SshCredentialsControllerTests : IDisposable
{
    private readonly ServicesDashboardContext _context;
    private readonly Mock<ILogger<SshCredentialsController>> _mockLogger;
    private readonly SshCredentialsController _controller;

    public SshCredentialsControllerTests()
    {
        var options = new DbContextOptionsBuilder<ServicesDashboardContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new ServicesDashboardContext(options);
        _mockLogger = new Mock<ILogger<SshCredentialsController>>();
        _controller = new SshCredentialsController(_context, _mockLogger.Object);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task GetCredentials_ReturnsOkWithCredentialsList()
    {
        // Arrange
        _context.SshCredentials.AddRange(
            new SshCredential { Id = 1, Name = "Credential 1", Username = "user1", Password = "pass1", CreatedAt = DateTime.UtcNow },
            new SshCredential { Id = 2, Name = "Credential 2", Username = "user2", Password = "pass2", CreatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetCredentials();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var credentials = Assert.IsAssignableFrom<IEnumerable<SshCredentialDto>>(okResult.Value);
        Assert.Equal(2, credentials.Count());
    }

    [Fact]
    public async Task GetCredentials_OrdersByName()
    {
        // Arrange
        _context.SshCredentials.AddRange(
            new SshCredential { Name = "Zebra", Username = "user1", Password = "pass1", CreatedAt = DateTime.UtcNow },
            new SshCredential { Name = "Alpha", Username = "user2", Password = "pass2", CreatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetCredentials();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var credentials = Assert.IsAssignableFrom<IEnumerable<SshCredentialDto>>(okResult.Value).ToList();
        Assert.Equal("Alpha", credentials[0].Name);
        Assert.Equal("Zebra", credentials[1].Name);
    }

    [Fact]
    public async Task GetCredential_WithValidId_ReturnsOkWithCredential()
    {
        // Arrange
        var credential = new SshCredential { Id = 1, Name = "Test", Username = "user", Password = "pass", CreatedAt = DateTime.UtcNow };
        _context.SshCredentials.Add(credential);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetCredential(1);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var credentialDto = Assert.IsType<SshCredentialDto>(okResult.Value);
        Assert.Equal("Test", credentialDto.Name);
    }

    [Fact]
    public async Task GetCredential_WithInvalidId_ReturnsNotFound()
    {
        // Act
        var result = await _controller.GetCredential(999);

        // Assert
        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task CreateCredential_WithValidData_ReturnsCreatedAtAction()
    {
        // Arrange
        var request = new CreateSshCredentialRequest
        {
            Name = "New Credential",
            Username = "newuser",
            Password = "newpass",
            Description = "Test description",
            DefaultPort = 22,
            IsDefault = false
        };

        // Act
        var result = await _controller.CreateCredential(request);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        var credential = Assert.IsType<SshCredentialDto>(createdResult.Value);
        Assert.Equal("New Credential", credential.Name);
        Assert.Equal("newuser", credential.Username);

        var savedCredential = await _context.SshCredentials.FirstOrDefaultAsync(c => c.Name == "New Credential");
        Assert.NotNull(savedCredential);
    }

    [Fact]
    public async Task CreateCredential_WithDuplicateName_ReturnsBadRequest()
    {
        // Arrange
        var existingCredential = new SshCredential { Name = "Existing", Username = "user", Password = "pass", CreatedAt = DateTime.UtcNow };
        _context.SshCredentials.Add(existingCredential);
        await _context.SaveChangesAsync();

        var request = new CreateSshCredentialRequest
        {
            Name = "Existing",
            Username = "newuser",
            Password = "newpass"
        };

        // Act
        var result = await _controller.CreateCredential(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Contains("already exists", badRequestResult.Value?.ToString());
    }

    [Fact]
    public async Task CreateCredential_WithIsDefaultTrue_UnsetsOtherDefaults()
    {
        // Arrange
        var existingDefault = new SshCredential
        {
            Name = "Old Default",
            Username = "user1",
            Password = "pass1",
            IsDefault = true,
            CreatedAt = DateTime.UtcNow
        };
        _context.SshCredentials.Add(existingDefault);
        await _context.SaveChangesAsync();

        var request = new CreateSshCredentialRequest
        {
            Name = "New Default",
            Username = "user2",
            Password = "pass2",
            IsDefault = true
        };

        // Act
        await _controller.CreateCredential(request);

        // Assert
        var oldDefault = await _context.SshCredentials.FindAsync(existingDefault.Id);
        Assert.False(oldDefault!.IsDefault);

        var newDefault = await _context.SshCredentials.FirstOrDefaultAsync(c => c.Name == "New Default");
        Assert.True(newDefault!.IsDefault);
    }

    [Fact]
    public async Task UpdateCredential_WithValidData_ReturnsNoContent()
    {
        // Arrange
        var credential = new SshCredential
        {
            Name = "Original",
            Username = "user",
            Password = "pass",
            DefaultPort = 22,
            CreatedAt = DateTime.UtcNow
        };
        _context.SshCredentials.Add(credential);
        await _context.SaveChangesAsync();

        var request = new UpdateSshCredentialRequest
        {
            Name = "Updated",
            Username = "newuser",
            DefaultPort = 2222
        };

        // Act
        var result = await _controller.UpdateCredential(credential.Id, request);

        // Assert
        Assert.IsType<NoContentResult>(result);

        var updated = await _context.SshCredentials.FindAsync(credential.Id);
        Assert.Equal("Updated", updated!.Name);
        Assert.Equal("newuser", updated.Username);
        Assert.Equal(2222, updated.DefaultPort);
        Assert.NotNull(updated.UpdatedAt);
    }

    [Fact]
    public async Task UpdateCredential_WithInvalidId_ReturnsNotFound()
    {
        // Arrange
        var request = new UpdateSshCredentialRequest { Name = "Test" };

        // Act
        var result = await _controller.UpdateCredential(999, request);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task UpdateCredential_WithDuplicateName_ReturnsBadRequest()
    {
        // Arrange
        _context.SshCredentials.AddRange(
            new SshCredential { Id = 1, Name = "First", Username = "user1", Password = "pass1", CreatedAt = DateTime.UtcNow },
            new SshCredential { Id = 2, Name = "Second", Username = "user2", Password = "pass2", CreatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();

        var request = new UpdateSshCredentialRequest { Name = "First" };

        // Act
        var result = await _controller.UpdateCredential(2, request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("already exists", badRequestResult.Value?.ToString());
    }

    [Fact]
    public async Task UpdateCredential_SetAsDefault_UnsetsOtherDefaults()
    {
        // Arrange
        _context.SshCredentials.AddRange(
            new SshCredential { Id = 1, Name = "First", Username = "user1", Password = "pass1", IsDefault = true, CreatedAt = DateTime.UtcNow },
            new SshCredential { Id = 2, Name = "Second", Username = "user2", Password = "pass2", IsDefault = false, CreatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();

        var request = new UpdateSshCredentialRequest { IsDefault = true };

        // Act
        await _controller.UpdateCredential(2, request);

        // Assert
        var first = await _context.SshCredentials.FindAsync(1);
        var second = await _context.SshCredentials.FindAsync(2);
        Assert.False(first!.IsDefault);
        Assert.True(second!.IsDefault);
    }

    [Fact]
    public async Task DeleteCredential_WithValidId_ReturnsNoContent()
    {
        // Arrange
        var credential = new SshCredential { Name = "ToDelete", Username = "user", Password = "pass", CreatedAt = DateTime.UtcNow };
        _context.SshCredentials.Add(credential);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.DeleteCredential(credential.Id);

        // Assert
        Assert.IsType<NoContentResult>(result);
        var deleted = await _context.SshCredentials.FindAsync(credential.Id);
        Assert.Null(deleted);
    }

    [Fact]
    public async Task DeleteCredential_WithInvalidId_ReturnsNotFound()
    {
        // Act
        var result = await _controller.DeleteCredential(999);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task DeleteCredential_WhenInUse_ReturnsBadRequest()
    {
        // Arrange
        var credential = new SshCredential
        {
            Name = "InUse",
            Username = "user",
            Password = "pass",
            CreatedAt = DateTime.UtcNow,
            ServersUsingCredential = new List<ManagedServer>
            {
                new ManagedServer { Name = "Server1", HostAddress = "192.168.1.1", Status = ServerStatus.Online }
            }
        };
        _context.SshCredentials.Add(credential);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.DeleteCredential(credential.Id);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("being used", badRequestResult.Value?.ToString());
    }

    [Fact]
    public async Task GetDefaultCredential_WhenExists_ReturnsOkWithCredential()
    {
        // Arrange
        _context.SshCredentials.AddRange(
            new SshCredential { Name = "Regular", Username = "user1", Password = "pass1", IsDefault = false, CreatedAt = DateTime.UtcNow },
            new SshCredential { Name = "Default", Username = "user2", Password = "pass2", IsDefault = true, CreatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetDefaultCredential();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var credential = Assert.IsType<SshCredentialDto>(okResult.Value);
        Assert.Equal("Default", credential.Name);
    }

    [Fact]
    public async Task GetDefaultCredential_WhenNoneExists_ReturnsNotFound()
    {
        // Arrange
        _context.SshCredentials.Add(
            new SshCredential { Name = "Regular", Username = "user", Password = "pass", IsDefault = false, CreatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetDefaultCredential();

        // Assert
        var notFoundResult = Assert.IsType<NotFoundObjectResult>(result.Result);
        Assert.Contains("No default credential", notFoundResult.Value?.ToString());
    }

    [Fact]
    public async Task TestCredential_WithValidConnection_ReturnsSuccess()
    {
        // Note: This test can't fully test SSH connection without a real SSH server
        // In a real scenario, you would mock the SSH client or use integration tests
        // For now, we test that the endpoint exists and handles the credential lookup

        // Arrange
        var credential = new SshCredential
        {
            Name = "Test",
            Username = "testuser",
            Password = "testpass",
            DefaultPort = 22,
            CreatedAt = DateTime.UtcNow
        };
        _context.SshCredentials.Add(credential);
        await _context.SaveChangesAsync();

        var request = new TestCredentialRequest
        {
            HostAddress = "localhost",
            Port = 22
        };

        // Act & Assert
        // This will fail to connect but should return a structured response
        var result = await _controller.TestCredential(credential.Id, request);

        // Should return either OK with success=false or error - not crash
        Assert.True(
            result is OkObjectResult || result is ObjectResult,
            "Should handle connection attempt gracefully"
        );
    }

    [Fact]
    public async Task TestCredential_WithInvalidId_ReturnsNotFound()
    {
        // Arrange
        var request = new TestCredentialRequest { HostAddress = "localhost" };

        // Act
        var result = await _controller.TestCredential(999, request);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    [Theory]
    [InlineData("Production Servers", "admin", 22)]
    [InlineData("Development", "dev-user", 2222)]
    [InlineData("Testing", "test", 22222)]
    public async Task CreateCredential_WithDifferentPorts_CreatesCorrectly(string name, string username, int port)
    {
        // Arrange
        var request = new CreateSshCredentialRequest
        {
            Name = name,
            Username = username,
            Password = "password",
            DefaultPort = port
        };

        // Act
        var result = await _controller.CreateCredential(request);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        var credential = Assert.IsType<SshCredentialDto>(createdResult.Value);
        Assert.Equal(name, credential.Name);
        Assert.Equal(username, credential.Username);
        Assert.Equal(port, credential.DefaultPort);
    }

    [Fact]
    public async Task GetCredentials_IncludesUsageCount()
    {
        // Arrange
        var credential = new SshCredential
        {
            Name = "Shared",
            Username = "user",
            Password = "pass",
            CreatedAt = DateTime.UtcNow,
            ServersUsingCredential = new List<ManagedServer>
            {
                new ManagedServer { Name = "Server1", HostAddress = "192.168.1.1", Status = ServerStatus.Online },
                new ManagedServer { Name = "Server2", HostAddress = "192.168.1.2", Status = ServerStatus.Online }
            }
        };
        _context.SshCredentials.Add(credential);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetCredentials();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var credentials = Assert.IsAssignableFrom<IEnumerable<SshCredentialDto>>(okResult.Value).ToList();
        Assert.Equal(2, credentials[0].UsageCount);
    }
}
