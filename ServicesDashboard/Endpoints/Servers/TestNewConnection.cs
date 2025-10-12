using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.Servers;

public class TestNewConnectionEndpoint : Endpoint<ServerConnectionDto, bool>
{
    private readonly IServerConnectionManager _connectionManager;

    public TestNewConnectionEndpoint(IServerConnectionManager connectionManager)
    {
        _connectionManager = connectionManager;
    }

    public override void Configure()
    {
        Post("/api/servers/test");
        AllowAnonymous();
    }

    public override async Task HandleAsync(ServerConnectionDto req, CancellationToken ct)
    {
        var result = await _connectionManager.TestConnectionAsync(req);
        await Send.OkAsync(result, ct);
    }
}
