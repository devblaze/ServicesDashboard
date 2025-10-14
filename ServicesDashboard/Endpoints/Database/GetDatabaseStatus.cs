using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Database;

namespace ServicesDashboard.Endpoints.Database;

public class GetDatabaseStatusEndpoint : EndpointWithoutRequest<DatabaseStatusResponse>
{
    private readonly IDatabaseMigrationService _databaseService;

    public GetDatabaseStatusEndpoint(IDatabaseMigrationService databaseService)
    {
        _databaseService = databaseService;
    }

    public override void Configure()
    {
        Get("/api/database/status");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var status = await _databaseService.GetDatabaseStatusAsync();
        await Send.OkAsync(status, ct);
    }
}
