using FastEndpoints;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Settings;
using System.Text.Json;

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
                var models = new List<string>();

                // Try OpenAI-compatible API first (/v1/models)
                try
                {
                    var v1ModelsUrl = $"{aiSettings.BaseUrl.TrimEnd('/')}/v1/models";
                    var v1Response = await _httpClient.GetAsync(v1ModelsUrl, ct);

                    if (v1Response.IsSuccessStatusCode)
                    {
                        var jsonContent = await v1Response.Content.ReadAsStringAsync(ct);
                        var jsonDoc = JsonDocument.Parse(jsonContent);

                        if (jsonDoc.RootElement.TryGetProperty("data", out var dataArray))
                        {
                            foreach (var model in dataArray.EnumerateArray())
                            {
                                if (model.TryGetProperty("id", out var idElement))
                                {
                                    var modelId = idElement.GetString();
                                    if (!string.IsNullOrEmpty(modelId))
                                    {
                                        models.Add(modelId);
                                    }
                                }
                            }
                        }

                        if (models.Count > 0)
                        {
                            await Send.OkAsync(models, ct);
                            return;
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to fetch models from /v1/models, trying /api/tags");
                }

                // Fallback to native Ollama API (/api/tags)
                var tagsUrl = $"{aiSettings.BaseUrl.TrimEnd('/')}/api/tags";
                var tagsResponse = await _httpClient.GetAsync(tagsUrl, ct);

                if (!tagsResponse.IsSuccessStatusCode)
                {
                    HttpContext.Response.StatusCode = 400;
                    await HttpContext.Response.WriteAsync(@"{""error"":""Failed to connect to Ollama server""}", ct);
                    return;
                }

                var tagsJsonContent = await tagsResponse.Content.ReadAsStringAsync(ct);
                var tagsJsonDoc = JsonDocument.Parse(tagsJsonContent);

                if (tagsJsonDoc.RootElement.TryGetProperty("models", out var modelsArray))
                {
                    foreach (var model in modelsArray.EnumerateArray())
                    {
                        if (model.TryGetProperty("name", out var nameElement))
                        {
                            var modelName = nameElement.GetString();
                            if (!string.IsNullOrEmpty(modelName))
                            {
                                models.Add(modelName);
                            }
                        }
                    }
                }

                await Send.OkAsync(models, ct);
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
        }
    }
}
