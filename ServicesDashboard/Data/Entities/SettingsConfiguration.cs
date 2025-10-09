using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ServicesDashboard.Data.Entities;

public class ApplicationSetting
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty; // e.g., "AI", "Notifications", "General"
    
    [Required]
    [MaxLength(100)]
    public string Key { get; set; } = string.Empty; // e.g., "Provider", "BaseUrl", "Model"
    
    [MaxLength(1000)]
    public string? Value { get; set; } // JSON or plain text value
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    [MaxLength(50)]
    public string ValueType { get; set; } = "String"; // String, Boolean, Integer, Json
    
    public bool IsEncrypted { get; set; } = false; // For sensitive data like API keys
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Add unique constraint on Category + Key combination
    [NotMapped]
    public string UniqueKey => $"{Category}_{Key}";
}

public class SettingsGroup
{
    public string Category { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public Dictionary<string, object> Settings { get; set; } = new();
}

// Strongly typed settings models
public class AISettings
{
    public string Provider { get; set; } = "ollama"; // ollama, openai, anthropic, deepseek, groq
    public string BaseUrl { get; set; } = "http://localhost:11434";
    public string Model { get; set; } = "llama3.2:3b-instruct-q8_0";
    public string? ApiKey { get; set; } // For OpenAI/Anthropic/DeepSeek/Groq
    public bool EnableServiceRecognition { get; set; } = true;
    public bool EnableScreenshots { get; set; } = true;
    public int TimeoutSeconds { get; set; } = 30;
}

public class NotificationSettings
{
    public bool EnablePushover { get; set; } = false;
    public string? PushoverUserKey { get; set; }
    public string? PushoverApiToken { get; set; }
    
    public bool EnablePushbullet { get; set; } = false;
    public string? PushbulletApiKey { get; set; }
    
    public bool EnableEmail { get; set; } = false;
    public string? SmtpServer { get; set; }
    public int SmtpPort { get; set; } = 587;
    public string? SmtpUsername { get; set; }
    public string? SmtpPassword { get; set; }
    public string? FromEmail { get; set; }
    public string? ToEmail { get; set; }
}

public class GeneralSettings
{
    public string ApplicationName { get; set; } = "Services Dashboard";
    public string Theme { get; set; } = "dark"; // dark, light, auto
    public int RefreshInterval { get; set; } = 30; // seconds
    public bool EnableAutoRefresh { get; set; } = true;
    public string DefaultScanPorts { get; set; } = "common"; // common, extended, custom
    public string? CustomPorts { get; set; } // comma-separated port list
}
