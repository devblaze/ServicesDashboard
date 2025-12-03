using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Database;

namespace ServicesDashboard.Endpoints.Database;

public class GenerateSyncTokenEndpoint : EndpointWithoutRequest<GenerateSyncTokenResponse>
{
    private readonly IDatabaseMigrationService _databaseService;

    public GenerateSyncTokenEndpoint(IDatabaseMigrationService databaseService)
    {
        _databaseService = databaseService;
    }

    public override void Configure()
    {
        Post("/api/database/generate-sync-token");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var result = _databaseService.GenerateSyncToken();
        await Send.OkAsync(result, ct);
    }
}
