using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.Servers;

public class GetConnectionRequest
{
    public string Id { get; set; } = string.Empty;
}

public class GetConnectionEndpoint : Endpoint<GetConnectionRequest, ServerConnection>
{
    private readonly IServerConnectionManager _connectionManager;

    public GetConnectionEndpoint(IServerConnectionManager connectionManager)
    {
        _connectionManager = connectionManager;
    }

    public override void Configure()
    {
        Get("/api/servers/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetConnectionRequest req, CancellationToken ct)
    {
        var connection = await _connectionManager.GetConnectionByIdAsync(req.Id);
        if (connection == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.OkAsync(connection, ct);
    }
}
