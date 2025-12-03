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
        // Get the actual URL from the request to show the user
        var request = HttpContext.Request;
        var scheme = request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? request.Scheme;
        var host = request.Headers["X-Forwarded-Host"].FirstOrDefault() ?? request.Host.ToString();
        var requestUrl = $"{scheme}://{host}";

        var result = _databaseService.GenerateSyncToken(requestUrl);
        await Send.OkAsync(result, ct);
    }
}
