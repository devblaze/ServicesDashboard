using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Database;

namespace ServicesDashboard.Endpoints.Database;

public class MigrateDatabaseEndpoint : Endpoint<MigrateDatabaseRequest, MigrateDatabaseResponse>
{
    private readonly IDatabaseMigrationService _databaseService;
    private readonly ILogger<MigrateDatabaseEndpoint> _logger;

    public MigrateDatabaseEndpoint(
        IDatabaseMigrationService databaseService,
        ILogger<MigrateDatabaseEndpoint> logger)
    {
        _databaseService = databaseService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/database/migrate");
        AllowAnonymous();
    }

    public override async Task HandleAsync(MigrateDatabaseRequest req, CancellationToken ct)
    {
        _logger.LogInformation("Database migration requested to {Provider}", req.TargetProvider);

        var result = await _databaseService.MigrateDatabaseAsync(req);

        if (result.Success)
        {
            await Send.OkAsync(result, ct);
        }
        else
        {
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsJsonAsync(result, ct);
        }
    }
}
