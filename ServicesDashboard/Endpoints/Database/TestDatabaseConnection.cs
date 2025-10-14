using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Database;

namespace ServicesDashboard.Endpoints.Database;

public class TestDatabaseConnectionEndpoint : Endpoint<TestDatabaseConnectionRequest, TestDatabaseConnectionResponse>
{
    private readonly IDatabaseMigrationService _databaseService;

    public TestDatabaseConnectionEndpoint(IDatabaseMigrationService databaseService)
    {
        _databaseService = databaseService;
    }

    public override void Configure()
    {
        Post("/api/database/test-connection");
        AllowAnonymous();
    }

    public override async Task HandleAsync(TestDatabaseConnectionRequest req, CancellationToken ct)
    {
        var result = await _databaseService.TestConnectionAsync(req);
        await Send.OkAsync(result, ct);
    }
}
