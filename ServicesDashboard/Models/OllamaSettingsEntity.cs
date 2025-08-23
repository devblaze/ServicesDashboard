using System.ComponentModel.DataAnnotations;

namespace ServicesDashboard.Models;

public class OllamaSettingsEntity
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(255)]
    public string BaseUrl { get; set; } = "http://192.168.4.253:11434";
    
    [Required]
    [MaxLength(100)]
    public string Model { get; set; } = "llama3.2:3b-instruct-q8_0";
    
    public bool EnableServiceRecognition { get; set; } = true;
    
    public bool EnableScreenshots { get; set; } = true;
    
    public int TimeoutSeconds { get; set; } = 30;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
