using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.Servers;

public class UpdateConnectionRequest
{
    public string Id { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string? Host { get; set; }
    public int? Port { get; set; }
    public string? Username { get; set; }
    public string? Password { get; set; }
}

public class UpdateConnectionEndpoint : Endpoint<UpdateConnectionRequest, ServerConnection>
{
    private readonly IServerConnectionManager _connectionManager;

    public UpdateConnectionEndpoint(IServerConnectionManager connectionManager)
    {
        _connectionManager = connectionManager;
    }

    public override void Configure()
    {
        Put("/api/servers/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(UpdateConnectionRequest req, CancellationToken ct)
    {
        var connectionDto = new ServerConnectionDto
        {
            Name = req.Name,
            Host = req.Host,
            Port = req.Port ?? 22,
            Username = req.Username,
            Password = req.Password
        };

        var connection = await _connectionManager.UpdateConnectionAsync(req.Id, connectionDto);
        if (connection == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.OkAsync(connection, ct);
    }
}
