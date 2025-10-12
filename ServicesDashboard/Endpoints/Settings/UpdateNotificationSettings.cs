using FastEndpoints;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Settings;

namespace ServicesDashboard.Endpoints.Settings;

public class UpdateNotificationSettingsEndpoint : Endpoint<NotificationSettings, NotificationSettings>
{
    private readonly ISettingsService _settingsService;
    private readonly ILogger<UpdateNotificationSettingsEndpoint> _logger;

    public UpdateNotificationSettingsEndpoint(
        ISettingsService settingsService,
        ILogger<UpdateNotificationSettingsEndpoint> logger)
    {
        _settingsService = settingsService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/settings/notifications");
        AllowAnonymous();
    }

    public override async Task HandleAsync(NotificationSettings req, CancellationToken ct)
    {
        try
        {
            if (req == null)
            {
                HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsync(@"{""error"":""Settings cannot be null""}", ct);
                return;
            }

            var success = await _settingsService.UpdateSettingsAsync(req, "Notifications");

            if (!success)
            {
                HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsync(@"{""error"":""Failed to update notification settings""}", ct);
                return;
            }

            await Send.OkAsync(req, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update notification settings");
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync($@"{{""error"":""Failed to update notification settings: {ex.Message.Replace("\"", "\\\"")}""}}", ct);
            return;
        }
    }
}
