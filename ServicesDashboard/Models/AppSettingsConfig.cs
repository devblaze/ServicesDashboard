namespace ServicesDashboard.Models;

public class AppSettings
{
    public OllamaSettings Ollama { get; set; } = new();
}

public class OllamaSettings
{
    public string BaseUrl { get; set; } = "http://192.168.4.253:11434";
    public string Model { get; set; } = "llama3.2:3b-instruct-q8_0";
    public bool EnableServiceRecognition { get; set; } = true;
    public bool EnableScreenshots { get; set; } = true;
    public int TimeoutSeconds { get; set; } = 30;
}
