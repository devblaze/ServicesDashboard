using ServicesDashboard.Models.Results;

namespace ServicesDashboard.Services.ArtificialIntelligence;

public interface ILogAnalyzer
{
    Task<LogAnalysisResult> AnalyzeLogsAsync(string logs);
}

public class LogAnalyzer : ILogAnalyzer
{
    private readonly ILogger<LogAnalyzer> _logger;
    private readonly HttpClient _httpClient;
    private readonly string _ollamaEndpoint;

    public LogAnalyzer(ILogger<LogAnalyzer> logger, HttpClient httpClient, IConfiguration configuration)
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
                // HasErrors = logs.Contains("error", StringComparison.OrdinalIgnoreCase),
                // Errors = logs.Contains("error", StringComparison.OrdinalIgnoreCase) 
                //     ? new List<string> { "Mock error found in logs" } 
                //     : new List<string>(),
                // Suggestions = logs.Contains("error", StringComparison.OrdinalIgnoreCase)
                //     ? new List<string> { "Check your configuration", "Restart the service" }
                //     : new List<string>()
            };
            
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error analyzing logs with Ollama");
            throw;
        }
    }

//     private async Task<LogAnalysisResult> AnalyzeVmLogs(string logs)
//     {
//                 try
//         {
//             var prompt = $@"
// Analyze these system logs from server '{server.Name}' ({server.OperatingSystem}):
//
// {logs}
//
// Please provide a JSON analysis with:
// 1. summary: Brief overview of log health
// 2. issues: Array of issues found (type, severity, description, logLine, lineNumber)
// 3. recommendations: Array of actionable recommendations
// 4. confidence: Analysis confidence (0-1)
//
// Respond only with valid JSON in this format:
// {{
//   ""summary"": ""Overall system appears healthy with minor warnings"",
//   ""issues"": [
//     {{
//       ""type"": ""Warning"",
//       ""severity"": ""Medium"",
//       ""description"": ""High memory usage detected"",
//       ""logLine"": ""relevant log line"",
//       ""lineNumber"": 42
//     }}
//   ],
//   ""recommendations"": [
//     ""Consider monitoring memory usage"",
//     ""Check for memory leaks in applications""
//   ],
//   ""confidence"": 0.8
// }}";
//
//             var response = new StringBuilder();
//             await foreach (var chunk in _ollamaClient.GenerateAsync(new GenerateRequest
//                            {
//                                Model = _settings.Ollama.Model,
//                                Prompt = prompt,
//                                Stream = false
//                            }))
//             {
//                 if (chunk?.Response != null)
//                     response.Append(chunk.Response);
//             }
//
//             var responseText = response.ToString().Trim();
//
//             // Try to extract JSON from the response
//             var jsonStart = responseText.IndexOf('{');
//             var jsonEnd = responseText.LastIndexOf('}');
//
//             if (jsonStart >= 0 && jsonEnd > jsonStart)
//             {
//                 var jsonText = responseText.Substring(jsonStart, jsonEnd - jsonStart + 1);
//                 var analysis = JsonSerializer.Deserialize<LogAnalysisResult>(jsonText, new JsonSerializerOptions
//                 {
//                     PropertyNameCaseInsensitive = true
//                 });
//
//                 if (analysis != null)
//                 {
//                     analysis.AnalyzedAt = DateTime.UtcNow;
//                     return analysis;
//                 }
//             }
//
//             // Fallback if JSON parsing fails
//             return new LogAnalysisResult
//             {
//                 Summary = "AI analysis completed, but response format was unexpected",
//                 Issues = new List<LogIssue>(),
//                 Recommendations = new List<string> { "Manual log review recommended" },
//                 Confidence = 0.3,
//                 AnalyzedAt = DateTime.UtcNow
//             };
//         }
//         catch (Exception ex)
//         {
//             _logger.LogError(ex, "Failed to analyze logs with AI for server {ServerId}", serverId);
//
//             return new LogAnalysisResult
//             {
//                 Summary = "AI analysis failed - manual review required",
//                 Issues = new List<LogIssue>
//                 {
//                     new LogIssue
//                     {
//                         Type = "Error",
//                         Severity = "High",
//                         Description = $"AI analysis failed: {ex.Message}",
//                         LogLine = "",
//                         LineNumber = 0
//                     }
//                 },
//                 Recommendations = new List<string> { "Perform manual log analysis" },
//                 Confidence = 0.1,
//                 AnalyzedAt = DateTime.UtcNow
//             };
//         }
//     }
}