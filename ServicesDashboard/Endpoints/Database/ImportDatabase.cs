using FastEndpoints;
using Microsoft.AspNetCore.Mvc;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Database;

namespace ServicesDashboard.Endpoints.Database;

public class ImportDatabaseEndpoint : Endpoint<DatabaseImportRequest, DatabaseImportResponse>
{
    private readonly IDatabaseMigrationService _databaseService;
    private readonly ILogger<ImportDatabaseEndpoint> _logger;

    public ImportDatabaseEndpoint(
        IDatabaseMigrationService databaseService,
        ILogger<ImportDatabaseEndpoint> logger)
    {
        _databaseService = databaseService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/database/import");
        AllowAnonymous();
    }

    public override async Task HandleAsync(DatabaseImportRequest req, CancellationToken ct)
    {
        _logger.LogInformation("Received database import request with {TableCount} tables from {SourceProvider}",
            req.Metadata?.TableCounts?.Count ?? 0, req.Metadata?.SourceProvider ?? "unknown");

        var result = await _databaseService.ImportDatabaseAsync(req);

        if (result.Success)
        {
            _logger.LogInformation("Database import completed: {RecordsImported} records imported", result.RecordsImported);
        }
        else
        {
            _logger.LogWarning("Database import failed: {Error}", result.Error ?? result.Message);
        }

        await Send.OkAsync(result, ct);
    }
}
