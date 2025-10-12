using FastEndpoints;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Settings;

namespace ServicesDashboard.Endpoints.Settings;

public class GetNotificationSettingsEndpoint : EndpointWithoutRequest<NotificationSettings>
{
    private readonly ISettingsService _settingsService;
    private readonly ILogger<GetNotificationSettingsEndpoint> _logger;

    public GetNotificationSettingsEndpoint(
        ISettingsService settingsService,
        ILogger<GetNotificationSettingsEndpoint> logger)
    {
        _settingsService = settingsService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/settings/notifications");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        try
        {
            var settings = await _settingsService.GetSettingsAsync<NotificationSettings>();
            await Send.OkAsync(settings, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get notification settings");

            // Return default settings as fallback
            var defaultSettings = new NotificationSettings();
            await Send.OkAsync(defaultSettings, ct);
        }
    }
}
