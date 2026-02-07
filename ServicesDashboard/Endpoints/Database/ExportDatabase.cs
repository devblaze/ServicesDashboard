using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Database;

namespace ServicesDashboard.Endpoints.Database;

public class ExportDatabaseEndpoint : EndpointWithoutRequest<DatabaseExportResponse>
{
    private readonly IDatabaseMigrationService _databaseService;

    public ExportDatabaseEndpoint(IDatabaseMigrationService databaseService)
    {
        _databaseService = databaseService;
    }

    public override void Configure()
    {
        Get("/api/database/export");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var result = await _databaseService.ExportDatabaseAsync();
        await Send.OkAsync(result, ct);
    }
}
