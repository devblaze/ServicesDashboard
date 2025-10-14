using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Database;

namespace ServicesDashboard.Endpoints.Database;

public class GetDatabaseConfigurationEndpoint : EndpointWithoutRequest<DatabaseConfigurationDto>
{
    private readonly IDatabaseMigrationService _databaseService;

    public GetDatabaseConfigurationEndpoint(IDatabaseMigrationService databaseService)
    {
        _databaseService = databaseService;
    }

    public override void Configure()
    {
        Get("/api/database/configuration");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var config = await _databaseService.GetCurrentConfigurationAsync();
        await Send.OkAsync(config, ct);
    }
}
