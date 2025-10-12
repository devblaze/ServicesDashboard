using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.Servers;

public class GetAllConnectionsEndpoint : EndpointWithoutRequest<IEnumerable<ServerConnection>>
{
    private readonly IServerConnectionManager _connectionManager;

    public GetAllConnectionsEndpoint(IServerConnectionManager connectionManager)
    {
        _connectionManager = connectionManager;
    }

    public override void Configure()
    {
        Get("/api/servers");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var connections = await _connectionManager.GetAllConnectionsAsync();
        await Send.OkAsync(connections, ct);
    }
}
