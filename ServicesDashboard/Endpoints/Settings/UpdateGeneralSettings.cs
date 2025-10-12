using FastEndpoints;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Settings;

namespace ServicesDashboard.Endpoints.Settings;

public class UpdateGeneralSettingsEndpoint : Endpoint<GeneralSettings, GeneralSettings>
{
    private readonly ISettingsService _settingsService;
    private readonly ILogger<UpdateGeneralSettingsEndpoint> _logger;

    public UpdateGeneralSettingsEndpoint(
        ISettingsService settingsService,
        ILogger<UpdateGeneralSettingsEndpoint> logger)
    {
        _settingsService = settingsService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/settings/general");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GeneralSettings req, CancellationToken ct)
    {
        try
        {
            if (req == null)
            {
                HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsync(@"{""error"":""Settings cannot be null""}", ct);
                return;
            }

            var success = await _settingsService.UpdateSettingsAsync(req, "General");

            if (!success)
            {
                HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsync(@"{""error"":""Failed to update general settings""}", ct);
                return;
            }

            await Send.OkAsync(req, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update general settings");
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync($@"{{""error"":""Failed to update general settings: {ex.Message.Replace("\"", "\\\"")}""}}", ct);
            return;
        }
    }
}
