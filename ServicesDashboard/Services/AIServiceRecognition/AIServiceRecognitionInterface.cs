using ServicesDashboard.Models;

namespace ServicesDashboard.Services.AIServiceRecognition;

public interface IAIServiceRecognitionService
{
    Task<ServiceRecognitionResult> RecognizeServiceAsync(string hostAddress, int port, string serviceType, string? banner = null, string? htmlContent = null, CancellationToken cancellationToken = default);
    Task<byte[]?> TakeScreenshotAsync(string url, CancellationToken cancellationToken = default);
    Task<bool> TestOllamaConnectionAsync();
}

public class ServiceRecognitionResult
{
    public string RecognizedName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string IconName { get; set; } = "server";
    public string Category { get; set; } = "Unknown";
    public double Confidence { get; set; } = 0.0;
    public Dictionary<string, string> Metadata { get; set; } = new();
    public string? ExtractedTitle { get; set; }
    public bool IsPopularService { get; set; } = false;
}