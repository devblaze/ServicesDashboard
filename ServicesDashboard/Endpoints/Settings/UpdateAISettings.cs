using FastEndpoints;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Settings;

namespace ServicesDashboard.Endpoints.Settings;

public class UpdateAISettingsEndpoint : Endpoint<AISettings, AISettings>
{
    private readonly ISettingsService _settingsService;
    private readonly ILogger<UpdateAISettingsEndpoint> _logger;

    public UpdateAISettingsEndpoint(
        ISettingsService settingsService,
        ILogger<UpdateAISettingsEndpoint> logger)
    {
        _settingsService = settingsService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/settings/ai");
        AllowAnonymous();
    }

    public override async Task HandleAsync(AISettings req, CancellationToken ct)
    {
        try
        {
            if (req == null)
            {
                HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsync(@"{""error"":""Settings cannot be null""}", ct);
                return;
            }

            var success = await _settingsService.UpdateSettingsAsync(req, "AI");

            if (!success)
            {
                HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsync(@"{""error"":""Failed to update AI settings""}", ct);
                return;
            }

            await Send.OkAsync(req, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update AI settings");
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync($@"{{""error"":""Failed to update AI settings: {ex.Message.Replace("\"", "\\\"")}""}}", ct);
            return;
        }
    }
}
