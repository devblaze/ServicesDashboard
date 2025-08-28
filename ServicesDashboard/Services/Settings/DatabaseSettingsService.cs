using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;
using ServicesDashboard.Data.Entities;

namespace ServicesDashboard.Services.Settings;

public interface ISettingsService
{
    Task<T> GetSettingsAsync<T>() where T : new();
    Task<bool> UpdateSettingsAsync<T>(T settings, string category);
    Task<Dictionary<string, object>> GetCategorySettingsAsync(string category);
    Task<bool> SetSettingAsync(string category, string key, object value, string? description = null, bool isEncrypted = false);
    Task<string?> GetSettingAsync(string category, string key);
    Task<IEnumerable<SettingsGroup>> GetAllSettingsGroupsAsync();
    Task InitializeDefaultSettingsAsync();
}

public class DatabaseSettingsService : ISettingsService
{
    private readonly ServicesDashboardContext _context;
    private readonly ILogger<DatabaseSettingsService> _logger;
    private readonly string _encryptionKey;

    public DatabaseSettingsService(ServicesDashboardContext context, ILogger<DatabaseSettingsService> logger, IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _encryptionKey = configuration["EncryptionKey"] ?? "DefaultKey123456789012345"; // Should be 32 chars for AES
    }

    public async Task<T> GetSettingsAsync<T>() where T : new()
    {
        var category = GetCategoryFromType<T>();
        var settings = await GetCategorySettingsAsync(category);
        
        // Use JsonSerializerOptions to handle the conversion properly
        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            WriteIndented = true
        };
        
        var json = JsonSerializer.Serialize(settings, options);
        
        try
        {
            return JsonSerializer.Deserialize<T>(json, options) ?? new T();
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to deserialize settings for type {Type}. JSON: {Json}", typeof(T).Name, json);
            
            // Return a new instance with default values as fallback
            return new T();
        }
    }

    public async Task<bool> UpdateSettingsAsync<T>(T settings, string category)
    {
        try
        {
            // Use reflection to get property values to maintain type information
            var settingsType = typeof(T);
            var properties = settingsType.GetProperties();

            foreach (var property in properties)
            {
                var value = property.GetValue(settings);
                var isEncrypted = IsEncryptedField(category, property.Name);
                
                var stringValue = value?.ToString() ?? string.Empty;
                
                if (isEncrypted && !string.IsNullOrEmpty(stringValue))
                {
                    stringValue = EncryptValue(stringValue);
                }

                await SetSettingAsync(category, property.Name, value ?? string.Empty, null, isEncrypted);
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update settings for category {Category}", category);
            return false;
        }
    }

    public async Task<Dictionary<string, object>> GetCategorySettingsAsync(string category)
    {
        var settings = await _context.ApplicationSettings
            .Where(s => s.Category == category)
            .ToListAsync();

        var result = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);

        foreach (var setting in settings)
        {
            var value = setting.Value;
            
            if (setting.IsEncrypted && !string.IsNullOrEmpty(value))
            {
                try
                {
                    value = DecryptValue(value);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to decrypt setting {Category}.{Key}", setting.Category, setting.Key);
                    continue;
                }
            }

            result[setting.Key] = ConvertValue(value, setting.ValueType);
        }

        return result;
    }

    public async Task<bool> SetSettingAsync(string category, string key, object value, string? description = null, bool isEncrypted = false)
    {
        try
        {
            var existing = await _context.ApplicationSettings
                .FirstOrDefaultAsync(s => s.Category == category && s.Key == key);

            var stringValue = value?.ToString();
            var valueType = GetValueType(value);

            if (existing != null)
            {
                existing.Value = stringValue;
                existing.ValueType = valueType;
                existing.IsEncrypted = isEncrypted;
                existing.UpdatedAt = DateTime.UtcNow;
                if (!string.IsNullOrEmpty(description))
                    existing.Description = description;
            }
            else
            {
                var setting = new ApplicationSetting
                {
                    Category = category,
                    Key = key,
                    Value = stringValue,
                    ValueType = valueType,
                    Description = description,
                    IsEncrypted = isEncrypted
                };

                _context.ApplicationSettings.Add(setting);
            }

            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to set setting {Category}.{Key}", category, key);
            return false;
        }
    }

    public async Task<string?> GetSettingAsync(string category, string key)
    {
        var setting = await _context.ApplicationSettings
            .FirstOrDefaultAsync(s => s.Category == category && s.Key == key);

        if (setting == null) return null;

        var value = setting.Value;
        
        if (setting.IsEncrypted && !string.IsNullOrEmpty(value))
        {
            try
            {
                value = DecryptValue(value);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to decrypt setting {Category}.{Key}", category, key);
                return null;
            }
        }

        return value;
    }

    public async Task<IEnumerable<SettingsGroup>> GetAllSettingsGroupsAsync()
    {
        var allSettings = await _context.ApplicationSettings.ToListAsync();
        
        var groups = new List<SettingsGroup>();
        
        foreach (var categoryGroup in allSettings.GroupBy(s => s.Category))
        {
            var settingsDict = new Dictionary<string, object>();
            
            foreach (var setting in categoryGroup)
            {
                var value = setting.Value;
                
                if (setting.IsEncrypted && !string.IsNullOrEmpty(value))
                {
                    try
                    {
                        value = DecryptValue(value);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to decrypt setting {Category}.{Key}", setting.Category, setting.Key);
                        continue;
                    }
                }

                settingsDict[setting.Key] = ConvertValue(value, setting.ValueType);
            }

            groups.Add(new SettingsGroup
            {
                Category = categoryGroup.Key,
                DisplayName = GetCategoryDisplayName(categoryGroup.Key),
                Description = GetCategoryDescription(categoryGroup.Key),
                Icon = GetCategoryIcon(categoryGroup.Key),
                Settings = settingsDict
            });
        }

        return groups;
    }

    public async Task InitializeDefaultSettingsAsync()
    {
        await InitializeAISettingsAsync();
        await InitializeNotificationSettingsAsync();
        await InitializeGeneralSettingsAsync();
    }

    private async Task InitializeAISettingsAsync()
    {
        var defaults = new Dictionary<string, (object value, string description, bool encrypted)>
        {
            ["Provider"] = ("ollama", "AI provider: ollama, openai, anthropic", false),
            ["BaseUrl"] = ("http://localhost:11434", "Base URL for Ollama server", false),
            ["Model"] = ("llama3.2:3b-instruct-q8_0", "AI model to use", false),
            ["ApiKey"] = ("", "API key for OpenAI/Anthropic (leave empty for Ollama)", true),
            ["EnableServiceRecognition"] = (true, "Enable AI-powered service recognition", false),
            ["EnableScreenshots"] = (true, "Enable screenshot capture for web services", false),
            ["TimeoutSeconds"] = (30, "Timeout for AI requests in seconds", false)
        };

        await InitializeCategoryDefaults("AI", defaults);
    }

    private async Task InitializeNotificationSettingsAsync()
    {
        var defaults = new Dictionary<string, (object value, string description, bool encrypted)>
        {
            ["EnablePushover"] = (false, "Enable Pushover notifications", false),
            ["PushoverUserKey"] = ("", "Pushover user key", true),
            ["PushoverApiToken"] = ("", "Pushover API token", true),
            ["EnablePushbullet"] = (false, "Enable Pushbullet notifications", false),
            ["PushbulletApiKey"] = ("", "Pushbullet API key", true),
            ["EnableEmail"] = (false, "Enable email notifications", false),
            ["SmtpServer"] = ("", "SMTP server hostname", false),
            ["SmtpPort"] = (587, "SMTP server port", false),
            ["SmtpUsername"] = ("", "SMTP username", false),
            ["SmtpPassword"] = ("", "SMTP password", true),
            ["FromEmail"] = ("", "From email address", false),
            ["ToEmail"] = ("", "To email address", false)
        };

        await InitializeCategoryDefaults("Notifications", defaults);
    }

    private async Task InitializeGeneralSettingsAsync()
    {
        var defaults = new Dictionary<string, (object value, string description, bool encrypted)>
        {
            ["ApplicationName"] = ("Services Dashboard", "Application display name", false),
            ["Theme"] = ("dark", "UI theme: dark, light, auto", false),
            ["RefreshInterval"] = (30, "Auto-refresh interval in seconds", false),
            ["EnableAutoRefresh"] = (true, "Enable automatic data refresh", false),
            ["DefaultScanPorts"] = ("common", "Default port scan type: common, extended, custom", false),
            ["CustomPorts"] = ("", "Custom port list (comma-separated)", false)
        };

        await InitializeCategoryDefaults("General", defaults);
    }

    private async Task InitializeCategoryDefaults(string category, Dictionary<string, (object value, string description, bool encrypted)> defaults)
    {
        foreach (var (key, (value, description, encrypted)) in defaults)
        {
            var exists = await _context.ApplicationSettings
                .AnyAsync(s => s.Category == category && s.Key == key);

            if (!exists)
            {
                await SetSettingAsync(category, key, value, description, encrypted);
            }
        }
    }

    private string GetCategoryFromType<T>()
    {
        return typeof(T).Name switch
        {
            nameof(AISettings) => "AI",
            nameof(NotificationSettings) => "Notifications", 
            nameof(GeneralSettings) => "General",
            _ => "General"
        };
    }

    private string GetCategoryDisplayName(string category)
    {
        return category switch
        {
            "AI" => "Artificial Intelligence",
            "Notifications" => "Notifications",
            "General" => "General Settings",
            _ => category
        };
    }

    private string GetCategoryDescription(string category)
    {
        return category switch
        {
            "AI" => "Configure AI providers for service recognition",
            "Notifications" => "Set up notification channels",
            "General" => "General application settings",
            _ => ""
        };
    }

    private string GetCategoryIcon(string category)
    {
        return category switch
        {
            "AI" => "bot",
            "Notifications" => "bell",
            "General" => "settings",
            _ => "settings"
        };
    }

    private bool IsEncryptedField(string category, string key)
    {
        var encryptedFields = new Dictionary<string, string[]>
        {
            ["AI"] = new[] { "ApiKey" },
            ["Notifications"] = new[] { "PushoverUserKey", "PushoverApiToken", "PushbulletApiKey", "SmtpPassword" }
        };

        return encryptedFields.ContainsKey(category) && encryptedFields[category].Contains(key);
    }

    private string EncryptValue(string value)
    {
        var key = Encoding.UTF8.GetBytes(_encryptionKey.PadRight(32).Substring(0, 32));
        using var aes = Aes.Create();
        aes.Key = key;
        aes.GenerateIV();

        using var encryptor = aes.CreateEncryptor();
        var plainBytes = Encoding.UTF8.GetBytes(value);
        var encryptedBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);
        
        var result = new byte[aes.IV.Length + encryptedBytes.Length];
        Buffer.BlockCopy(aes.IV, 0, result, 0, aes.IV.Length);
        Buffer.BlockCopy(encryptedBytes, 0, result, aes.IV.Length, encryptedBytes.Length);
        
        return Convert.ToBase64String(result);
    }

    private string DecryptValue(string encryptedValue)
    {
        var key = Encoding.UTF8.GetBytes(_encryptionKey.PadRight(32).Substring(0, 32));
        var fullBytes = Convert.FromBase64String(encryptedValue);
        
        using var aes = Aes.Create();
        aes.Key = key;
        
        var iv = new byte[aes.IV.Length];
        var encryptedBytes = new byte[fullBytes.Length - iv.Length];
        
        Buffer.BlockCopy(fullBytes, 0, iv, 0, iv.Length);
        Buffer.BlockCopy(fullBytes, iv.Length, encryptedBytes, 0, encryptedBytes.Length);
        
        aes.IV = iv;
        
        using var decryptor = aes.CreateDecryptor();
        var plainBytes = decryptor.TransformFinalBlock(encryptedBytes, 0, encryptedBytes.Length);
        
        return Encoding.UTF8.GetString(plainBytes);
    }

    private object ConvertValue(string? value, string valueType)
    {
        if (string.IsNullOrEmpty(value))
        {
            return valueType switch
            {
                "Boolean" => false,
                "Integer" => 0,
                _ => string.Empty
            };
        }

        return valueType switch
        {
            "Boolean" => value.ToLowerInvariant() switch
            {
                "true" => true,
                "false" => false,
                "1" => true,
                "0" => false,
                _ => bool.TryParse(value, out var boolResult) ? boolResult : false
            },
            "Integer" => int.TryParse(value, out var intVal) ? intVal : 0,
            "Json" => TryDeserializeJson(value),
            _ => value
        };
    }

    private object TryDeserializeJson(string value)
    {
        try
        {
            return JsonSerializer.Deserialize<object>(value) ?? value;
        }
        catch
        {
            return value; // Return as string if JSON deserialization fails
        }
    }

    private string GetValueType(object? value)
    {
        return value switch
        {
            bool => "Boolean",
            int => "Integer",
            long => "Integer",
            decimal => "Integer",
            double => "Integer",
            float => "Integer",
            string => "String",
            _ => "String"
        };
    }
}