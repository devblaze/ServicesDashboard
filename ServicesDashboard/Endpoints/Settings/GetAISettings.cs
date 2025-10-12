using FastEndpoints;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Settings;

namespace ServicesDashboard.Endpoints.Settings;

public class GetAISettingsEndpoint : EndpointWithoutRequest<AISettings>
{
    private readonly ISettingsService _settingsService;
    private readonly ILogger<GetAISettingsEndpoint> _logger;

    public GetAISettingsEndpoint(
        ISettingsService settingsService,
        ILogger<GetAISettingsEndpoint> logger)
    {
        _settingsService = settingsService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/settings/ai");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        try
        {
            var settings = await _settingsService.GetSettingsAsync<AISettings>();
            await Send.OkAsync(settings, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get AI settings");

            // Return default settings as fallback
            var defaultSettings = new AISettings();
            await Send.OkAsync(defaultSettings, ct);
        }
    }
}
