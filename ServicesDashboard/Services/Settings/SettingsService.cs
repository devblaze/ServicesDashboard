
using System.Text.Json;
using ServicesDashboard.Models;
using Microsoft.Extensions.Options;

namespace ServicesDashboard.Services;

public class SettingsService : ISettingsService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<SettingsService> _logger;
    private readonly string _settingsFilePath;

    public SettingsService(IConfiguration configuration, IWebHostEnvironment environment, ILogger<SettingsService> logger)
    {
        _configuration = configuration;
        _logger = logger;
        _settingsFilePath = Path.Combine(environment.ContentRootPath, "appsettings.json");
    }

    public async Task<bool> UpdateOllamaSettingsAsync(OllamaSettings settings)
    {
        try
        {
            // Read the current appsettings.json
            string jsonContent;
            if (File.Exists(_settingsFilePath))
            {
                jsonContent = await File.ReadAllTextAsync(_settingsFilePath);
            }
            else
            {
                jsonContent = "{}";
            }

            // Parse the JSON
            var jsonDoc = JsonDocument.Parse(jsonContent);
            var rootElement = jsonDoc.RootElement;
            
            // Create a new JSON structure
            var newSettings = new Dictionary<string, object>();
            
            // Copy existing settings
            foreach (var property in rootElement.EnumerateObject())
            {
                if (property.Name != "AppSettings")
                {
                    newSettings[property.Name] = JsonSerializer.Deserialize<object>(property.Value.GetRawText());
                }
            }

            // Update AppSettings
            var appSettings = new Dictionary<string, object>();
            if (rootElement.TryGetProperty("AppSettings", out var appSettingsElement))
            {
                foreach (var property in appSettingsElement.EnumerateObject())
                {
                    if (property.Name != "Ollama")
                    {
                        appSettings[property.Name] = JsonSerializer.Deserialize<object>(property.Value.GetRawText());
                    }
                }
            }

            // Add the new Ollama settings
            appSettings["Ollama"] = settings;
            newSettings["AppSettings"] = appSettings;

            // Write back to file
            var options = new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };

            var updatedJson = JsonSerializer.Serialize(newSettings, options);
            await File.WriteAllTextAsync(_settingsFilePath, updatedJson);

            _logger.LogInformation("Ollama settings updated successfully");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update Ollama settings");
            return false;
        }
    }

    public async Task<OllamaSettings> GetOllamaSettingsAsync()
    {
        return new OllamaSettings
        {
            BaseUrl = _configuration["AppSettings:Ollama:BaseUrl"] ?? "http://192.168.4.253:11434",
            Model = _configuration["AppSettings:Ollama:Model"] ?? "llama3.2:3b-instruct-q8_0",
            EnableServiceRecognition = bool.Parse(_configuration["AppSettings:Ollama:EnableServiceRecognition"] ?? "true"),
            EnableScreenshots = bool.Parse(_configuration["AppSettings:Ollama:EnableScreenshots"] ?? "true"),
            TimeoutSeconds = int.Parse(_configuration["AppSettings:Ollama:TimeoutSeconds"] ?? "30")
        };
    }
}
