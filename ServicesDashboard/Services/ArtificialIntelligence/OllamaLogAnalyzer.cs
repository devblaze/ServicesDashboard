using ServicesDashboard.Models;
using ServicesDashboard.Models.Results;

namespace ServicesDashboard.Services;

public interface ILogAnalyzer
{
    Task<LogAnalysisResult> AnalyzeLogsAsync(string logs);
}

public class OllamaLogAnalyzer : ILogAnalyzer
{
    private readonly ILogger<OllamaLogAnalyzer> _logger;
    private readonly HttpClient _httpClient;
    private readonly string _ollamaEndpoint;

    public OllamaLogAnalyzer(ILogger<OllamaLogAnalyzer> logger, HttpClient httpClient, IConfiguration configuration)
    {
        _logger = logger;
        _httpClient = httpClient;
        _ollamaEndpoint = configuration["AI:OllamaEndpoint"] ?? "http://localhost:11434/api/generate";
    }

    public async Task<LogAnalysisResult> AnalyzeLogsAsync(string logs)
    {
        try
        {
            _logger.LogInformation("Analyzing logs using Ollama");
            
            // In a real implementation, you would send the logs to Ollama
            // and parse the response
            
            // Mock response for now
            var result = new LogAnalysisResult
            {
                HasErrors = logs.Contains("error", StringComparison.OrdinalIgnoreCase),
                Errors = logs.Contains("error", StringComparison.OrdinalIgnoreCase) 
                    ? new List<string> { "Mock error found in logs" } 
                    : new List<string>(),
                Suggestions = logs.Contains("error", StringComparison.OrdinalIgnoreCase)
                    ? new List<string> { "Check your configuration", "Restart the service" }
                    : new List<string>()
            };
            
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error analyzing logs with Ollama");
            throw;
        }
    }
}