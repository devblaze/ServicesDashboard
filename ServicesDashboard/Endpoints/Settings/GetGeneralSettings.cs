using FastEndpoints;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Settings;

namespace ServicesDashboard.Endpoints.Settings;

public class GetGeneralSettingsEndpoint : EndpointWithoutRequest<GeneralSettings>
{
    private readonly ISettingsService _settingsService;
    private readonly ILogger<GetGeneralSettingsEndpoint> _logger;

    public GetGeneralSettingsEndpoint(
        ISettingsService settingsService,
        ILogger<GetGeneralSettingsEndpoint> logger)
    {
        _settingsService = settingsService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/settings/general");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        try
        {
            var settings = await _settingsService.GetSettingsAsync<GeneralSettings>();
            await Send.OkAsync(settings, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get general settings");

            // Return default settings as fallback
            var defaultSettings = new GeneralSettings();
            await Send.OkAsync(defaultSettings, ct);
        }
    }
}
