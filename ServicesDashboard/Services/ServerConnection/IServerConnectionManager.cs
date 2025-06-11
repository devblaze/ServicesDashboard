// ServicesDashboard/Services/ServerConnection/IServerConnectionManager.cs
namespace ServicesDashboard.Services.ServerConnection;

public interface IServerConnectionManager
{
    Task<IEnumerable<Models.ServerConnection>> GetAllConnectionsAsync();
    Task<Models.ServerConnection?> GetConnectionByIdAsync(string id);
    Task<Models.ServerConnection> AddConnectionAsync(Models.ServerConnectionDto connectionDto);
    Task<Models.ServerConnection?> UpdateConnectionAsync(string id, Models.ServerConnectionDto connectionDto);
    Task<bool> DeleteConnectionAsync(string id);
    Task<bool> TestConnectionAsync(string id);
    Task<bool> TestConnectionAsync(Models.ServerConnectionDto connectionDto);
}