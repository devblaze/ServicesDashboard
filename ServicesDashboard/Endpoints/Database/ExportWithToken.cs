using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Database;

namespace ServicesDashboard.Endpoints.Database;

public class ExportWithTokenRequest
{
    public string Token { get; set; } = string.Empty;
}

public class ExportWithTokenEndpoint : Endpoint<ExportWithTokenRequest, DatabaseExportResponse>
{
    private readonly IDatabaseMigrationService _databaseService;

    public ExportWithTokenEndpoint(IDatabaseMigrationService databaseService)
    {
        _databaseService = databaseService;
    }

    public override void Configure()
    {
        Get("/api/database/export-with-token");
        AllowAnonymous();
    }

    public override async Task HandleAsync(ExportWithTokenRequest req, CancellationToken ct)
    {
        var result = await _databaseService.ExportWithTokenAsync(req.Token);

        if (!result.Success)
        {
            HttpContext.Response.StatusCode = 401;
            await Send.OkAsync(result, ct);
            return;
        }

        await Send.OkAsync(result, ct);
    }
}
