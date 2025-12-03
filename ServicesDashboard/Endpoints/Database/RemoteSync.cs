using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Database;

namespace ServicesDashboard.Endpoints.Database;

public class RemoteSyncEndpoint : Endpoint<RemoteSyncRequest, RemoteSyncResponse>
{
    private readonly IDatabaseMigrationService _databaseService;

    public RemoteSyncEndpoint(IDatabaseMigrationService databaseService)
    {
        _databaseService = databaseService;
    }

    public override void Configure()
    {
        Post("/api/database/remote-sync");
        AllowAnonymous();
    }

    public override async Task HandleAsync(RemoteSyncRequest req, CancellationToken ct)
    {
        var result = await _databaseService.RemoteSyncAsync(req);
        await Send.OkAsync(result, ct);
    }
}
