using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Renci.SshNet;
using ServicesDashboard.Data;
using ServicesDashboard.Models;

namespace ServicesDashboard.Services.Servers;

public interface IServerConnectionManager
{
    Task<IEnumerable<ServerConnection>> GetAllConnectionsAsync();
    Task<ServerConnection?> GetConnectionByIdAsync(string id);
    Task<ServerConnection> AddConnectionAsync(ServerConnectionDto connectionDto);
    Task<ServerConnection?> UpdateConnectionAsync(string id, ServerConnectionDto connectionDto);
    Task<bool> DeleteConnectionAsync(string id);
    Task<bool> TestConnectionAsync(string id);
    Task<bool> TestConnectionAsync(ServerConnectionDto connectionDto);
}

public class ServerConnectionManager : IServerConnectionManager
{
    private readonly ILogger<ServerConnectionManager> _logger;
    private readonly string _connectionsFilePath;
    private readonly SemaphoreSlim _semaphore = new(1, 1);
    private readonly IServiceProvider _serviceProvider;

    public ServerConnectionManager(ILogger<ServerConnectionManager> logger, IWebHostEnvironment environment, IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _connectionsFilePath = Path.Combine(environment.ContentRootPath, "Data", "server-connections.json");

        // Ensure directory exists
        Directory.CreateDirectory(Path.GetDirectoryName(_connectionsFilePath)!);

        // Create empty file if it doesn't exist
        if (!File.Exists(_connectionsFilePath))
        {
            File.WriteAllText(_connectionsFilePath, "[]");
        }
    }

    public async Task<IEnumerable<ServerConnection>> GetAllConnectionsAsync()
    {
        await _semaphore.WaitAsync();
        try
        {
            var json = await File.ReadAllTextAsync(_connectionsFilePath);
            var connections = JsonSerializer.Deserialize<List<ServerConnection>>(json) ?? new List<ServerConnection>();
            return connections;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get server connections");
            return new List<ServerConnection>();
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<ServerConnection?> GetConnectionByIdAsync(string id)
    {
        var connections = await GetAllConnectionsAsync();
        return connections.FirstOrDefault(c => c.Id == id);
    }

    public async Task<ServerConnection> AddConnectionAsync(ServerConnectionDto connectionDto)
    {
        await _semaphore.WaitAsync();
        try
        {
            var json = await File.ReadAllTextAsync(_connectionsFilePath);
            var connections = JsonSerializer.Deserialize<List<ServerConnection>>(json) ?? new List<ServerConnection>();

            // Check if we should use SSH credentials
            var username = connectionDto.Username;
            var password = connectionDto.Password ?? string.Empty;

            if (connectionDto.SshCredentialId.HasValue)
            {
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();
                var credential = await dbContext.SshCredentials.FindAsync(connectionDto.SshCredentialId.Value);

                if (credential != null)
                {
                    username = credential.Username;
                    password = credential.Password;
                    connectionDto.Port = credential.DefaultPort ?? connectionDto.Port;
                }
            }

            var newConnection = new ServerConnection
            {
                Id = Guid.NewGuid().ToString(),
                Name = connectionDto.Name,
                Host = connectionDto.Host,
                Port = connectionDto.Port,
                Username = username,
                AuthMethod = connectionDto.AuthMethod,
                Password = password,
                PrivateKeyPath = connectionDto.PrivateKeyPath ?? string.Empty,
                DockerEndpoint = connectionDto.DockerEndpoint,
                LastConnected = DateTimeOffset.UtcNow
            };

            connections.Add(newConnection);

            await File.WriteAllTextAsync(_connectionsFilePath,
                JsonSerializer.Serialize(connections, new JsonSerializerOptions { WriteIndented = true }));

            return newConnection;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to add server connection");
            throw;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<ServerConnection?> UpdateConnectionAsync(string id, ServerConnectionDto connectionDto)
    {
        await _semaphore.WaitAsync();
        try
        {
            var json = await File.ReadAllTextAsync(_connectionsFilePath);
            var connections = JsonSerializer.Deserialize<List<ServerConnection>>(json) ?? new List<ServerConnection>();
            
            var existingConnection = connections.FirstOrDefault(c => c.Id == id);
            if (existingConnection == null)
            {
                return null;
            }
            
            existingConnection.Name = connectionDto.Name;
            existingConnection.Host = connectionDto.Host;
            existingConnection.Port = connectionDto.Port;
            existingConnection.Username = connectionDto.Username;
            existingConnection.AuthMethod = connectionDto.AuthMethod;
            
            // Only update password if provided
            if (!string.IsNullOrEmpty(connectionDto.Password))
            {
                existingConnection.Password = connectionDto.Password;
            }
            
            // Only update private key path if provided
            if (!string.IsNullOrEmpty(connectionDto.PrivateKeyPath))
            {
                existingConnection.PrivateKeyPath = connectionDto.PrivateKeyPath;
            }
            
            existingConnection.DockerEndpoint = connectionDto.DockerEndpoint;
            
            await File.WriteAllTextAsync(_connectionsFilePath, 
                JsonSerializer.Serialize(connections, new JsonSerializerOptions { WriteIndented = true }));
            
            return existingConnection;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update server connection");
            throw;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<bool> DeleteConnectionAsync(string id)
    {
        await _semaphore.WaitAsync();
        try
        {
            var json = await File.ReadAllTextAsync(_connectionsFilePath);
            var connections = JsonSerializer.Deserialize<List<ServerConnection>>(json) ?? new List<ServerConnection>();
            
            var existingConnection = connections.FirstOrDefault(c => c.Id == id);
            if (existingConnection == null)
            {
                return false;
            }
            
            connections.Remove(existingConnection);
            
            await File.WriteAllTextAsync(_connectionsFilePath, 
                JsonSerializer.Serialize(connections, new JsonSerializerOptions { WriteIndented = true }));
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete server connection");
            return false;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<bool> TestConnectionAsync(string id)
    {
        var connection = await GetConnectionByIdAsync(id);
        if (connection == null)
        {
            return false;
        }
        
        return await TestSshConnectionAsync(connection);
    }

    public async Task<bool> TestConnectionAsync(ServerConnectionDto connectionDto)
    {
        // Check if we should use SSH credentials
        var username = connectionDto.Username;
        var password = connectionDto.Password ?? string.Empty;
        var port = connectionDto.Port;

        if (connectionDto.SshCredentialId.HasValue)
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();
            var credential = await dbContext.SshCredentials.FindAsync(connectionDto.SshCredentialId.Value);

            if (credential != null)
            {
                username = credential.Username;
                password = credential.Password;
                port = credential.DefaultPort ?? connectionDto.Port;
            }
        }

        var connection = new ServerConnection
        {
            Host = connectionDto.Host,
            Port = port,
            Username = username,
            AuthMethod = connectionDto.AuthMethod,
            Password = password,
            PrivateKeyPath = connectionDto.PrivateKeyPath ?? string.Empty
        };

        return await TestSshConnectionAsync(connection);
    }

    private async Task<bool> TestSshConnectionAsync(ServerConnection connection)
    {
        try
        {
            using var client = CreateSshClient(connection);
            client.Connect();
            
            // Test Docker connection by running a simple command
            using var cmd = client.CreateCommand("docker ps --format '{{.Names}}'");
            var result = await Task.Run(() => cmd.Execute());
            
            client.Disconnect();
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to connect to server {ServerName} at {Host}:{Port}", 
                connection.Name, connection.Host, connection.Port);
            return false;
        }
    }

    private SshClient CreateSshClient(ServerConnection connection)
    {
        if (connection.AuthMethod == "PrivateKey" && !string.IsNullOrEmpty(connection.PrivateKeyPath))
        {
            var keyFile = new PrivateKeyFile(connection.PrivateKeyPath);
            return new SshClient(connection.Host, connection.Port, connection.Username, keyFile);
        }
        else
        {
            return new SshClient(connection.Host, connection.Port, connection.Username, connection.Password);
        }
    }
}