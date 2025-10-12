using FastEndpoints;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.Servers;

public class DeleteConnectionRequest
{
    public string Id { get; set; } = string.Empty;
}

public class DeleteConnectionEndpoint : Endpoint<DeleteConnectionRequest>
{
    private readonly IServerConnectionManager _connectionManager;

    public DeleteConnectionEndpoint(IServerConnectionManager connectionManager)
    {
        _connectionManager = connectionManager;
    }

    public override void Configure()
    {
        Delete("/api/servers/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(DeleteConnectionRequest req, CancellationToken ct)
    {
        var result = await _connectionManager.DeleteConnectionAsync(req.Id);
        if (!result)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.NoContentAsync(ct);
    }
}
