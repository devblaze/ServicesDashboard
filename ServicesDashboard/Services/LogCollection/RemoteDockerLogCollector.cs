using Renci.SshNet;
using ServicesDashboard.Services.ServerConnection;

namespace ServicesDashboard.Services.LogCollection;

public class RemoteDockerLogCollector : IRemoteLogCollector
{
    private readonly IServerConnectionManager _connectionManager;
    private readonly ILogger<RemoteDockerLogCollector> _logger;

    public RemoteDockerLogCollector(
        IServerConnectionManager connectionManager,
        ILogger<RemoteDockerLogCollector> logger)
    {
        _connectionManager = connectionManager;
        _logger = logger;
    }

    public async Task<IEnumerable<RemoteContainer>> ListContainersAsync(string serverId)
    {
        var connection = await _connectionManager.GetConnectionByIdAsync(serverId);
        if (connection == null)
        {
            throw new ArgumentException($"Server connection with ID {serverId} not found");
        }

        try
        {
            using var client = CreateSshClient(connection);
            client.Connect();

            // List containers with format specifiers to get ID, name, state, image
            var command = "docker ps -a --format \"{{.ID}}|{{.Names}}|{{.Status}}|{{.Image}}\"";
            using var cmd = client.CreateCommand(command);
            var result = await Task.Run(() => cmd.Execute());

            client.Disconnect();

            var containers = new List<RemoteContainer>();
            
            foreach (var line in result.Split('\n', StringSplitOptions.RemoveEmptyEntries))
            {
                var parts = line.Split('|');
                if (parts.Length >= 4)
                {
                    containers.Add(new RemoteContainer
                    {
                        Id = parts[0],
                        Name = parts[1],
                        Status = parts[2],
                        Image = parts[3],
                        ServerId = serverId
                    });
                }
            }

            return containers;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list containers on server {ServerName}", connection.Name);
            throw;
        }
    }

    public async Task<string> GetContainerLogsAsync(string serverId, string containerId, int lines = 100)
    {
        var connection = await _connectionManager.GetConnectionByIdAsync(serverId);
        if (connection == null)
        {
            throw new ArgumentException($"Server connection with ID {serverId} not found");
        }

        try
        {
            using var client = CreateSshClient(connection);
            client.Connect();

            // Get container logs
            var command = $"docker logs --tail {lines} {containerId}";
            using var cmd = client.CreateCommand(command);
            var result = await Task.Run(() => cmd.Execute());

            client.Disconnect();

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get logs for container {ContainerId} on server {ServerName}", 
                containerId, connection.Name);
            throw;
        }
    }

    public async Task<string> DownloadContainerLogsAsync(string serverId, string containerId)
    {
        var connection = await _connectionManager.GetConnectionByIdAsync(serverId);
        if (connection == null)
        {
            throw new ArgumentException($"Server connection with ID {serverId} not found");
        }

        try
        {
            using var client = CreateSshClient(connection);
            client.Connect();

            // Get all container logs
            var command = $"docker logs {containerId}";
            using var cmd = client.CreateCommand(command);
            var result = await Task.Run(() => cmd.Execute());

            client.Disconnect();

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to download logs for container {ContainerId} on server {ServerName}", 
                containerId, connection.Name);
            throw;
        }
    }

    public async Task<ContainerStats> GetContainerStatsAsync(string serverId, string containerId)
    {
        var connection = await _connectionManager.GetConnectionByIdAsync(serverId);
        if (connection == null)
        {
            throw new ArgumentException($"Server connection with ID {serverId} not found");
        }

        try
        {
            using var client = CreateSshClient(connection);
            client.Connect();

            // Get container stats in JSON format
            var command = $"docker stats {containerId} --no-stream --format \"{{{{.CPUPerc}}}}|{{{{.MemUsage}}}}|{{{{.MemPerc}}}}|{{{{.NetIO}}}}|{{{{.BlockIO}}}}\"";
            using var cmd = client.CreateCommand(command);
            var result = await Task.Run(() => cmd.Execute());

            client.Disconnect();

            var parts = result.Trim().Split('|');
            if (parts.Length >= 5)
            {
                return new ContainerStats
                {
                    ContainerId = containerId,
                    CpuPercentage = ParsePercentage(parts[0]),
                    MemoryUsage = parts[1],
                    MemoryPercentage = ParsePercentage(parts[2]),
                    NetworkIO = parts[3],
                    BlockIO = parts[4],
                    Timestamp = DateTimeOffset.UtcNow
                };
            }

            return new ContainerStats
            {
                ContainerId = containerId,
                Timestamp = DateTimeOffset.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get stats for container {ContainerId} on server {ServerName}", 
                containerId, connection.Name);
            throw;
        }
    }

    public async Task<bool> RestartContainerAsync(string serverId, string containerId)
    {
        var connection = await _connectionManager.GetConnectionByIdAsync(serverId);
        if (connection == null)
        {
            throw new ArgumentException($"Server connection with ID {serverId} not found");
        }

        try
        {
            using var client = CreateSshClient(connection);
            client.Connect();

            var command = $"docker restart {containerId}";
            using var cmd = client.CreateCommand(command);
            await Task.Run(() => cmd.Execute());

            client.Disconnect();

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to restart container {ContainerId} on server {ServerName}", 
                containerId, connection.Name);
            return false;
        }
    }

    public async Task<bool> StopContainerAsync(string serverId, string containerId)
    {
        var connection = await _connectionManager.GetConnectionByIdAsync(serverId);
        if (connection == null)
        {
            throw new ArgumentException($"Server connection with ID {serverId} not found");
        }

        try
        {
            using var client = CreateSshClient(connection);
            client.Connect();

            var command = $"docker stop {containerId}";
            using var cmd = client.CreateCommand(command);
            await Task.Run(() => cmd.Execute());

            client.Disconnect();

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to stop container {ContainerId} on server {ServerName}", 
                containerId, connection.Name);
            return false;
        }
    }

    public async Task<bool> StartContainerAsync(string serverId, string containerId)
    {
        var connection = await _connectionManager.GetConnectionByIdAsync(serverId);
        if (connection == null)
        {
            throw new ArgumentException($"Server connection with ID {serverId} not found");
        }

        try
        {
            using var client = CreateSshClient(connection);
            client.Connect();

            var command = $"docker start {containerId}";
            using var cmd = client.CreateCommand(command);
            await Task.Run(() => cmd.Execute());

            client.Disconnect();

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start container {ContainerId} on server {ServerName}", 
                containerId, connection.Name);
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

    private float ParsePercentage(string percentageStr)
    {
        if (float.TryParse(percentageStr.Replace("%", ""), out var percentage))
        {
            return percentage;
        }
        return 0;
    }
}