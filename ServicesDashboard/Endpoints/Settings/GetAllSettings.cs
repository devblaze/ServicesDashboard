using FastEndpoints;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Services.Settings;

namespace ServicesDashboard.Endpoints.Settings;

public class GetAllSettingsEndpoint : EndpointWithoutRequest<IEnumerable<SettingsGroup>>
{
    private readonly ISettingsService _settingsService;
    private readonly ILogger<GetAllSettingsEndpoint> _logger;

    public GetAllSettingsEndpoint(
        ISettingsService settingsService,
        ILogger<GetAllSettingsEndpoint> logger)
    {
        _settingsService = settingsService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/settings");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        try
        {
            var settings = await _settingsService.GetAllSettingsGroupsAsync();
            await Send.OkAsync(settings, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get all settings");
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync($@"{{""error"":""Failed to retrieve settings: {ex.Message.Replace("\"", "\\\"")}""}}", ct);
            return;
        }
    }
}
