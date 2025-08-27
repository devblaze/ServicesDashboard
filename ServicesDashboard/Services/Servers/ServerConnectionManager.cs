// ServicesDashboard/Services/ServerConnection/ServerConnectionManager.cs
using System.Text.Json;
using ServicesDashboard.Models;
using Renci.SshNet;

namespace ServicesDashboard.Services.ServerConnection;

public class ServerConnectionManager : IServerConnectionManager
{
    private readonly ILogger<ServerConnectionManager> _logger;
    private readonly string _connectionsFilePath;
    private readonly SemaphoreSlim _semaphore = new(1, 1);
    
    public ServerConnectionManager(ILogger<ServerConnectionManager> logger, IWebHostEnvironment environment)
    {
        _logger = logger;
        _connectionsFilePath = Path.Combine(environment.ContentRootPath, "Data", "server-connections.json");
        
        // Ensure directory exists
        Directory.CreateDirectory(Path.GetDirectoryName(_connectionsFilePath)!);
        
        // Create empty file if it doesn't exist
        if (!File.Exists(_connectionsFilePath))
        {
            File.WriteAllText(_connectionsFilePath, "[]");
        }
    }

    public async Task<IEnumerable<Models.ServerConnection>> GetAllConnectionsAsync()
    {
        await _semaphore.WaitAsync();
        try
        {
            var json = await File.ReadAllTextAsync(_connectionsFilePath);
            var connections = JsonSerializer.Deserialize<List<Models.ServerConnection>>(json) ?? new List<Models.ServerConnection>();
            return connections;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get server connections");
            return new List<Models.ServerConnection>();
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<Models.ServerConnection?> GetConnectionByIdAsync(string id)
    {
        var connections = await GetAllConnectionsAsync();
        return connections.FirstOrDefault(c => c.Id == id);
    }

    public async Task<Models.ServerConnection> AddConnectionAsync(ServerConnectionDto connectionDto)
    {
        await _semaphore.WaitAsync();
        try
        {
            var json = await File.ReadAllTextAsync(_connectionsFilePath);
            var connections = JsonSerializer.Deserialize<List<Models.ServerConnection>>(json) ?? new List<Models.ServerConnection>();
            
            var newConnection = new Models.ServerConnection
            {
                Id = Guid.NewGuid().ToString(),
                Name = connectionDto.Name,
                Host = connectionDto.Host,
                Port = connectionDto.Port,
                Username = connectionDto.Username,
                AuthMethod = connectionDto.AuthMethod,
                Password = connectionDto.Password ?? string.Empty,
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

    public async Task<Models.ServerConnection?> UpdateConnectionAsync(string id, ServerConnectionDto connectionDto)
    {
        await _semaphore.WaitAsync();
        try
        {
            var json = await File.ReadAllTextAsync(_connectionsFilePath);
            var connections = JsonSerializer.Deserialize<List<Models.ServerConnection>>(json) ?? new List<Models.ServerConnection>();
            
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
            var connections = JsonSerializer.Deserialize<List<Models.ServerConnection>>(json) ?? new List<Models.ServerConnection>();
            
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

    public Task<bool> TestConnectionAsync(ServerConnectionDto connectionDto)
    {
        var connection = new Models.ServerConnection
        {
            Host = connectionDto.Host,
            Port = connectionDto.Port,
            Username = connectionDto.Username,
            AuthMethod = connectionDto.AuthMethod,
            Password = connectionDto.Password ?? string.Empty,
            PrivateKeyPath = connectionDto.PrivateKeyPath ?? string.Empty
        };
        
        return TestSshConnectionAsync(connection);
    }

    private async Task<bool> TestSshConnectionAsync(Models.ServerConnection connection)
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

    private SshClient CreateSshClient(Models.ServerConnection connection)
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