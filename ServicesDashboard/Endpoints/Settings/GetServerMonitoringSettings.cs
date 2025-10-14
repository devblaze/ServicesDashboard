using FastEndpoints;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Services.Settings;

namespace ServicesDashboard.Endpoints.Settings;

public class GetServerMonitoringSettingsEndpoint : EndpointWithoutRequest<ServerMonitoringSettings>
{
    private readonly ISettingsService _settingsService;
    private readonly ILogger<GetServerMonitoringSettingsEndpoint> _logger;

    public GetServerMonitoringSettingsEndpoint(
        ISettingsService settingsService,
        ILogger<GetServerMonitoringSettingsEndpoint> logger)
    {
        _settingsService = settingsService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/settings/server-monitoring");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        try
        {
            var settings = await _settingsService.GetSettingsAsync<ServerMonitoringSettings>();
            await Send.OkAsync(settings, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get server monitoring settings");

            // Return default settings as fallback
            var defaultSettings = new ServerMonitoringSettings();
            await Send.OkAsync(defaultSettings, ct);
        }
    }
}
