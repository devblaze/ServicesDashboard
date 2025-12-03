using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Database;

namespace ServicesDashboard.Endpoints.Database;

public class ImportDatabaseEndpoint : Endpoint<DatabaseImportRequest, DatabaseImportResponse>
{
    private readonly IDatabaseMigrationService _databaseService;

    public ImportDatabaseEndpoint(IDatabaseMigrationService databaseService)
    {
        _databaseService = databaseService;
    }

    public override void Configure()
    {
        Post("/api/database/import");
        AllowAnonymous();
    }

    public override async Task HandleAsync(DatabaseImportRequest req, CancellationToken ct)
    {
        var result = await _databaseService.ImportDatabaseAsync(req);
        await Send.OkAsync(result, ct);
    }
}
