using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Requests;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class UpdateServerRequest
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public string? HostAddress { get; set; }
    public int? SshPort { get; set; }
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string? Type { get; set; }
    public string? Group { get; set; }
    public string? Tags { get; set; }
    public int? ParentServerId { get; set; }
}

public class UpdateServerEndpoint : Endpoint<UpdateServerRequest, ManagedServer>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<UpdateServerEndpoint> _logger;

    public UpdateServerEndpoint(
        IServerManagementService serverManagementService,
        ILogger<UpdateServerEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Put("/api/servermanagement/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(UpdateServerRequest req, CancellationToken ct)
    {
        try
        {
            var existingServer = await _serverManagementService.GetServerAsync(req.Id);
            if (existingServer == null)
            {
                await Send.NotFoundAsync(ct);
            return;
            }

            // Check for host address conflicts
            if (!string.IsNullOrWhiteSpace(req.HostAddress) &&
                !string.Equals(existingServer.HostAddress, req.HostAddress, StringComparison.OrdinalIgnoreCase))
            {
                var isHostAvailable = await _serverManagementService.IsHostAddressAvailableAsync(req.HostAddress);
                if (!isHostAvailable)
                {
                    HttpContext.Response.StatusCode = 400;
                    var escapedHostAddress = req.HostAddress.Replace("\"", "\\\"");
                    await HttpContext.Response.WriteAsync($@"{{""error"":""DuplicateHostAddress"",""message"":""A server with host address '{escapedHostAddress}' already exists.""}}", ct);
                    return;
                }
            }

            // Apply partial updates
            var serverToUpdate = ApplyPartialUpdate(existingServer, req);

            var updatedServer = await _serverManagementService.UpdateServerAsync(serverToUpdate);
            await Send.OkAsync(updatedServer, ct);
        }
        catch (ArgumentException)
        {
            await Send.NotFoundAsync(ct);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("already exists"))
        {
            _logger.LogWarning("Attempted to update server with duplicate host address: {HostAddress}", req.HostAddress);
            HttpContext.Response.StatusCode = 400;
            var escapedMessage = ex.Message.Replace("\"", "\\\"");
            await HttpContext.Response.WriteAsync($@"{{""error"":""DuplicateHostAddress"",""message"":""{escapedMessage}""}}", ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating server {ServerId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
        }
    }

    private static ManagedServer ApplyPartialUpdate(ManagedServer existingServer, UpdateServerRequest request)
    {
        return new ManagedServer
        {
            Id = existingServer.Id,
            Name = UpdateField(request.Name, existingServer.Name),
            HostAddress = UpdateField(request.HostAddress, existingServer.HostAddress),
            SshPort = request.SshPort ?? existingServer.SshPort,
            Username = UpdateField(request.Username, existingServer.Username),
            EncryptedPassword = UpdateField(request.Password, existingServer.EncryptedPassword),
            Type = UpdateEnum<ServerType>(request.Type, existingServer.Type),
            Group = UpdateEnum<ServerGroup>(request.Group, existingServer.Group),
            Tags = UpdateTags(request.Tags, existingServer.Tags),
            ParentServerId = request.ParentServerId, // Accept null to remove parent

            // Preserve existing values
            Status = existingServer.Status,
            OperatingSystem = existingServer.OperatingSystem,
            SystemInfo = existingServer.SystemInfo,
            LastCheckTime = existingServer.LastCheckTime,
            CreatedAt = existingServer.CreatedAt,
            UpdatedAt = DateTime.UtcNow,
            SshKeyPath = existingServer.SshKeyPath
        };
    }

    private static string? UpdateField(string? newValue, string? existingValue)
    {
        return !string.IsNullOrWhiteSpace(newValue) ? newValue.Trim() : existingValue;
    }

    private static T UpdateEnum<T>(string? newValue, T existingValue) where T : struct, Enum
    {
        return !string.IsNullOrWhiteSpace(newValue) && Enum.TryParse<T>(newValue, true, out var parsedValue)
            ? parsedValue
            : existingValue;
    }

    private static string? UpdateTags(string? newValue, string? existingValue)
    {
        // If tags is explicitly provided (even if empty), use it
        // If tags is null, keep existing value
        return newValue != null ? (string.IsNullOrWhiteSpace(newValue) ? null : newValue.Trim()) : existingValue;
    }
}
