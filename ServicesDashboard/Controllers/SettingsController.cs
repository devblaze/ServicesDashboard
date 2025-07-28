using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using ServicesDashboard.Models;
using ServicesDashboard.Services.AIServiceRecognition;
using ServicesDashboard.Services;
using System.Text.Json;

namespace ServicesDashboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly IOptionsSnapshot<AppSettings> _settings;
    private readonly IConfiguration _configuration;
    private readonly IAIServiceRecognitionService _aiService;
    private readonly ISettingsService _settingsService;
    private readonly ILogger<SettingsController> _logger;
    private readonly HttpClient _httpClient;

    public SettingsController(
        IOptionsSnapshot<AppSettings> settings,
        IConfiguration configuration,
        IAIServiceRecognitionService aiService,
        ISettingsService settingsService,
        ILogger<SettingsController> logger,
        HttpClient httpClient)
    {
        _settings = settings;
        _configuration = configuration;
        _aiService = aiService;
        _settingsService = settingsService;
        _logger = logger;
        _httpClient = httpClient;
    }

    [HttpGet("ollama")]
    public async Task<ActionResult<OllamaSettings>> GetOllamaSettings()
    {
        var settings = await _settingsService.GetOllamaSettingsAsync();
        return Ok(settings);
    }

    [HttpPost("ollama")]
    public async Task<ActionResult<OllamaSettings>> UpdateOllamaSettings([FromBody] OllamaSettings settings)
    {
        try
        {
            // Test the connection using direct HTTP call
            var modelsUrl = $"{settings.BaseUrl.TrimEnd('/')}/api/tags";
            var response = await _httpClient.GetAsync(modelsUrl);
            
            if (!response.IsSuccessStatusCode)
            {
                return BadRequest($"Failed to connect to Ollama server at {settings.BaseUrl}");
            }

            var jsonContent = await response.Content.ReadAsStringAsync();
            var modelsResponse = JsonSerializer.Deserialize<OllamaModelsResponse>(jsonContent, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (modelsResponse?.Models?.Any() != true)
            {
                return BadRequest("No models found on the Ollama server. Please install a model first.");
            }

            var modelNames = modelsResponse.Models.Select(m => m.Name).ToArray();
            if (!modelNames.Any(name => name.Contains(settings.Model)))
            {
                return BadRequest($"Model '{settings.Model}' not found. Available models: {string.Join(", ", modelNames)}");
            }

            // Save the settings
            var saved = await _settingsService.UpdateOllamaSettingsAsync(settings);
            if (!saved)
            {
                return BadRequest("Failed to save settings");
            }

            _logger.LogInformation("Ollama settings updated and saved successfully");
            return Ok(settings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to validate and save Ollama settings");
            return BadRequest($"Failed to connect to Ollama server: {ex.Message}");
        }
    }

    [HttpPost("ollama/test")]
    public async Task<ActionResult<bool>> TestOllamaConnection()
    {
        var result = await _aiService.TestOllamaConnectionAsync();
        return Ok(result);
    }

    [HttpGet("ollama/models")]
    public async Task<ActionResult<IEnumerable<string>>> GetAvailableModels()
    {
        try
        {
            var modelsUrl = $"{_settings.Value.Ollama.BaseUrl.TrimEnd('/')}/api/tags";
            var response = await _httpClient.GetAsync(modelsUrl);
            
            if (!response.IsSuccessStatusCode)
            {
                return BadRequest("Failed to connect to Ollama server");
            }

            var jsonContent = await response.Content.ReadAsStringAsync();
            var modelsResponse = JsonSerializer.Deserialize<OllamaModelsResponse>(jsonContent, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            var modelNames = modelsResponse?.Models?.Select(m => m.Name).ToArray() ?? Array.Empty<string>();
            return Ok(modelNames);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get available models");
            return BadRequest($"Failed to get models: {ex.Message}");
        }
    }

    // Helper classes for JSON deserialization
    private class OllamaModelsResponse
    {
        public OllamaModel[]? Models { get; set; }
    }

    private class OllamaModel
    {
        public string Name { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public long Size { get; set; }
        public string Digest { get; set; } = string.Empty;
        public DateTime ModifiedAt { get; set; }
    }
}