using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.Servers;

public class AddConnectionEndpoint : Endpoint<ServerConnectionDto, ServerConnection>
{
    private readonly IServerConnectionManager _connectionManager;

    public AddConnectionEndpoint(IServerConnectionManager connectionManager)
    {
        _connectionManager = connectionManager;
    }

    public override void Configure()
    {
        Post("/api/servers");
        AllowAnonymous();
    }

    public override async Task HandleAsync(ServerConnectionDto req, CancellationToken ct)
    {
        var connection = await _connectionManager.AddConnectionAsync(req);
        await Send.CreatedAtAsync<GetConnectionEndpoint>(new { id = connection.Id }, connection, cancellation: ct);
    }
}
