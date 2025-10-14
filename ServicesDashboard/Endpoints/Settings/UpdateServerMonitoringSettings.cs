using FastEndpoints;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Services.Settings;

namespace ServicesDashboard.Endpoints.Settings;

public class UpdateServerMonitoringSettingsEndpoint : Endpoint<ServerMonitoringSettings, ServerMonitoringSettings>
{
    private readonly ISettingsService _settingsService;
    private readonly ILogger<UpdateServerMonitoringSettingsEndpoint> _logger;

    public UpdateServerMonitoringSettingsEndpoint(
        ISettingsService settingsService,
        ILogger<UpdateServerMonitoringSettingsEndpoint> logger)
    {
        _settingsService = settingsService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/settings/server-monitoring");
        AllowAnonymous();
    }

    public override async Task HandleAsync(ServerMonitoringSettings req, CancellationToken ct)
    {
        try
        {
            if (req == null)
            {
                HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsync(@"{""error"":""Settings cannot be null""}", ct);
                return;
            }

            var success = await _settingsService.UpdateSettingsAsync(req, "ServerMonitoring");

            if (!success)
            {
                HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsync(@"{""error"":""Failed to update server monitoring settings""}", ct);
                return;
            }

            await Send.OkAsync(req, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update server monitoring settings");
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync($@"{{""error"":""Failed to update server monitoring settings: {ex.Message.Replace("\"", "\\\"")}""}}", ct);
            return;
        }
    }
}
