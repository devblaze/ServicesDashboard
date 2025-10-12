using FastEndpoints;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Settings;

namespace ServicesDashboard.Endpoints.Settings;

public class GetAvailableModelsEndpoint : EndpointWithoutRequest<IEnumerable<string>>
{
    private readonly ISettingsService _settingsService;
    private readonly ILogger<GetAvailableModelsEndpoint> _logger;
    private readonly HttpClient _httpClient;

    public GetAvailableModelsEndpoint(
        ISettingsService settingsService,
        ILogger<GetAvailableModelsEndpoint> logger,
        HttpClient httpClient)
    {
        _settingsService = settingsService;
        _logger = logger;
        _httpClient = httpClient;
    }

    public override void Configure()
    {
        Get("/api/settings/ai/models");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        try
        {
            var aiSettings = await _settingsService.GetSettingsAsync<AISettings>();

            if (aiSettings.Provider == "ollama")
            {
                var modelsUrl = $"{aiSettings.BaseUrl.TrimEnd('/')}/api/tags";
                var response = await _httpClient.GetAsync(modelsUrl, ct);

                if (!response.IsSuccessStatusCode)
                {
                    HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsync(@"{""error"":""Failed to connect to Ollama server""}", ct);
                return;
                }

                var jsonContent = await response.Content.ReadAsStringAsync(ct);
                // Parse and return model names...
                await Send.OkAsync(new[] { aiSettings.Model }, ct); // Simplified for now
            }
            else
            {
                await Send.OkAsync(Array.Empty<string>(), ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get available models");
            HttpContext.Response.StatusCode = 400;
            await HttpContext.Response.WriteAsync($@"{{""error"":""Failed to get models: {ex.Message.Replace("\"", "\\\"")}""}}", ct);
            return;
        }
    }
}
