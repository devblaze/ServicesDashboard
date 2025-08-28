using Microsoft.AspNetCore.Mvc;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Models;
using ServicesDashboard.Services.ArtificialIntelligence;
using ServicesDashboard.Services.Settings;

namespace ServicesDashboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly ISettingsService _settingsService;
    private readonly IServiceRecognitionService _serviceRecognition;
    private readonly ILogger<SettingsController> _logger;
    private readonly HttpClient _httpClient;

    public SettingsController(
        ISettingsService settingsService,
        IServiceRecognitionService serviceRecognition,
        ILogger<SettingsController> logger,
        HttpClient httpClient)
    {
        _settingsService = settingsService;
        _serviceRecognition = serviceRecognition;
        _logger = logger;
        _httpClient = httpClient;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SettingsGroup>>> GetAllSettings()
    {
        try
        {
            var settings = await _settingsService.GetAllSettingsGroupsAsync();
            return Ok(settings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get all settings");
            return StatusCode(500, $"Failed to retrieve settings: {ex.Message}");
        }
    }

    [HttpGet("ai")]
    public async Task<ActionResult<AISettings>> GetAISettings()
    {
        try
        {
            var settings = await _settingsService.GetSettingsAsync<AISettings>();
            return Ok(settings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get AI settings");
            
            // Return default settings as fallback
            var defaultSettings = new AISettings();
            return Ok(defaultSettings);
        }
    }

    [HttpPost("ai")]
    public async Task<ActionResult> UpdateAISettings([FromBody] AISettings settings)
    {
        try
        {
            if (settings == null)
            {
                return BadRequest("Settings cannot be null");
            }

            var success = await _settingsService.UpdateSettingsAsync(settings, "AI");
            
            if (!success)
            {
                return BadRequest("Failed to update AI settings");
            }

            return Ok(settings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update AI settings");
            return StatusCode(500, $"Failed to update AI settings: {ex.Message}");
        }
    }

    [HttpGet("notifications")]
    public async Task<ActionResult<NotificationSettings>> GetNotificationSettings()
    {
        try
        {
            var settings = await _settingsService.GetSettingsAsync<NotificationSettings>();
            return Ok(settings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get notification settings");
            
            // Return default settings as fallback
            var defaultSettings = new NotificationSettings();
            return Ok(defaultSettings);
        }
    }

    [HttpPost("notifications")]
    public async Task<ActionResult> UpdateNotificationSettings([FromBody] NotificationSettings settings)
    {
        try
        {
            if (settings == null)
            {
                return BadRequest("Settings cannot be null");
            }

            var success = await _settingsService.UpdateSettingsAsync(settings, "Notifications");
            
            if (!success)
            {
                return BadRequest("Failed to update notification settings");
            }

            return Ok(settings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update notification settings");
            return StatusCode(500, $"Failed to update notification settings: {ex.Message}");
        }
    }

    [HttpGet("general")]
    public async Task<ActionResult<GeneralSettings>> GetGeneralSettings()
    {
        try
        {
            var settings = await _settingsService.GetSettingsAsync<GeneralSettings>();
            return Ok(settings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get general settings");
            
            // Return default settings as fallback
            var defaultSettings = new GeneralSettings();
            return Ok(defaultSettings);
        }
    }

    [HttpPost("general")]
    public async Task<ActionResult> UpdateGeneralSettings([FromBody] GeneralSettings settings)
    {
        try
        {
            if (settings == null)
            {
                return BadRequest("Settings cannot be null");
            }

            var success = await _settingsService.UpdateSettingsAsync(settings, "General");
            
            if (!success)
            {
                return BadRequest("Failed to update general settings");
            }

            return Ok(settings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update general settings");
            return StatusCode(500, $"Failed to update general settings: {ex.Message}");
        }
    }

    [HttpPost("ai/test")]
    public async Task<ActionResult<bool>> TestAIConnection()
    {
        try
        {
            var result = await _serviceRecognition.TestOllamaConnectionAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to test AI connection");
            return Ok(false);
        }
    }

    [HttpGet("ai/models")]
    public async Task<ActionResult<IEnumerable<string>>> GetAvailableModels()
    {
        try
        {
            var aiSettings = await _settingsService.GetSettingsAsync<AISettings>();
            
            if (aiSettings.Provider == "ollama")
            {
                var modelsUrl = $"{aiSettings.BaseUrl.TrimEnd('/')}/api/tags";
                var response = await _httpClient.GetAsync(modelsUrl);
                
                if (!response.IsSuccessStatusCode)
                    return BadRequest("Failed to connect to Ollama server");

                var jsonContent = await response.Content.ReadAsStringAsync();
                // Parse and return model names...
                return Ok(new[] { aiSettings.Model }); // Simplified for now
            }

            return Ok(Array.Empty<string>());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get available models");
            return BadRequest($"Failed to get models: {ex.Message}");
        }
    }
}