using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using ServicesDashboard.Data;
using ServicesDashboard.Models;
using Microsoft.EntityFrameworkCore;

namespace ServicesDashboard.Services.AI;

public class AIErrorAnalysisService : IAIErrorAnalysisService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ServicesDashboardContext _context;
    private readonly ILogger<AIErrorAnalysisService> _logger;

    public AIErrorAnalysisService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ServicesDashboardContext context,
        ILogger<AIErrorAnalysisService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _context = context;
        _logger = logger;
    }

    public async Task<AIErrorAnalysisResult> AnalyzeErrorAsync(ErrorContext context)
    {
        try
        {
            var ollamaBaseUrl = _configuration["AppSettings:Ollama:BaseUrl"];
            var ollamaModel = _configuration["AppSettings:Ollama:Model"];
            var timeoutSeconds = int.Parse(_configuration["AppSettings:Ollama:TimeoutSeconds"] ?? "30");

            if (string.IsNullOrEmpty(ollamaBaseUrl) || string.IsNullOrEmpty(ollamaModel))
            {
                _logger.LogWarning("Ollama configuration missing. Skipping AI error analysis.");
                return new AIErrorAnalysisResult
                {
                    Diagnosis = "AI analysis unavailable - Ollama not configured",
                    SuggestedSolutions = new List<string> { "Check application logs for more details" },
                    RequiresManualIntervention = true
                };
            }

            var prompt = BuildErrorAnalysisPrompt(context);

            var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(timeoutSeconds + 10);

            var requestBody = new
            {
                model = ollamaModel,
                prompt = prompt,
                stream = false,
                options = new
                {
                    temperature = 0.3,
                    num_predict = 500
                }
            };

            _logger.LogInformation("🤖 Analyzing error with AI: {Operation}", context.Operation);

            var response = await httpClient.PostAsJsonAsync($"{ollamaBaseUrl}/api/generate", requestBody);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<OllamaResponse>();

            if (result?.Response == null)
            {
                throw new Exception("Empty response from Ollama");
            }

            return ParseAIResponse(result.Response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to analyze error with AI for operation: {Operation}", context.Operation);
            return new AIErrorAnalysisResult
            {
                Diagnosis = $"AI analysis failed: {ex.Message}",
                SuggestedSolutions = new List<string>
                {
                    "Review error logs manually",
                    "Check if Ollama server is running and accessible"
                },
                RequiresManualIntervention = true
            };
        }
    }

    public async Task<ErrorNotification> CreateErrorNotificationAsync(ErrorContext context, AIErrorAnalysisResult? analysis = null)
    {
        // If no analysis provided, generate one
        if (analysis == null)
        {
            analysis = await AnalyzeErrorAsync(context);
        }

        var notification = new ErrorNotification
        {
            ServerId = context.ServerId,
            Operation = context.Operation,
            ErrorMessage = context.ErrorMessage,
            AIAnalysis = analysis.Diagnosis,
            SuggestedSolutions = analysis.SuggestedSolutions,
            IsResolved = false,
            CreatedAt = DateTime.UtcNow
        };

        // Note: Storing in memory for now. Add to DbContext if you want persistence
        _logger.LogInformation("📬 Error notification created for {Operation}", context.Operation);
        _logger.LogInformation("🔍 AI Diagnosis: {Diagnosis}", analysis.Diagnosis);

        if (analysis.SuggestedSolutions.Any())
        {
            _logger.LogInformation("💡 Suggested Solutions:");
            foreach (var solution in analysis.SuggestedSolutions)
            {
                _logger.LogInformation("   • {Solution}", solution);
            }
        }

        return notification;
    }

    public async Task<List<ErrorNotification>> GetUnresolvedErrorsAsync()
    {
        // TODO: Implement database storage for error notifications
        // For now, return empty list
        return new List<ErrorNotification>();
    }

    public async Task<bool> MarkErrorResolvedAsync(int errorId, string resolution)
    {
        // TODO: Implement database storage for error notifications
        return true;
    }

    private string BuildErrorAnalysisPrompt(ErrorContext context)
    {
        var sb = new StringBuilder();
        sb.AppendLine("You are a systems administrator and DevOps expert. Analyze this error and provide actionable solutions.");
        sb.AppendLine();
        sb.AppendLine($"OPERATION: {context.Operation}");
        sb.AppendLine($"ERROR: {context.ErrorMessage}");

        if (!string.IsNullOrEmpty(context.CommandExecuted))
        {
            sb.AppendLine($"COMMAND: {context.CommandExecuted}");
        }

        if (!string.IsNullOrEmpty(context.CommandOutput))
        {
            sb.AppendLine($"OUTPUT: {context.CommandOutput}");
        }

        if (!string.IsNullOrEmpty(context.ServerOs))
        {
            sb.AppendLine($"OS: {context.ServerOs}");
        }

        foreach (var kvp in context.AdditionalContext)
        {
            sb.AppendLine($"{kvp.Key}: {kvp.Value}");
        }

        sb.AppendLine();
        sb.AppendLine("Please provide:");
        sb.AppendLine("1. DIAGNOSIS: What likely caused this error (one sentence)");
        sb.AppendLine("2. SOLUTIONS: List 2-3 specific, actionable solutions (one per line, numbered)");
        sb.AppendLine("3. NEXT_STEPS: What should the user do immediately");
        sb.AppendLine();
        sb.AppendLine("Format your response as:");
        sb.AppendLine("DIAGNOSIS: <diagnosis>");
        sb.AppendLine("SOLUTIONS:");
        sb.AppendLine("1. <solution 1>");
        sb.AppendLine("2. <solution 2>");
        sb.AppendLine("NEXT_STEPS: <next steps>");

        return sb.ToString();
    }

    private AIErrorAnalysisResult ParseAIResponse(string response)
    {
        var result = new AIErrorAnalysisResult
        {
            SuggestedSolutions = new List<string>()
        };

        var lines = response.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var currentSection = "";

        foreach (var line in lines)
        {
            if (line.StartsWith("DIAGNOSIS:", StringComparison.OrdinalIgnoreCase))
            {
                result.Diagnosis = line.Substring("DIAGNOSIS:".Length).Trim();
                currentSection = "diagnosis";
            }
            else if (line.StartsWith("SOLUTIONS:", StringComparison.OrdinalIgnoreCase))
            {
                currentSection = "solutions";
            }
            else if (line.StartsWith("NEXT_STEPS:", StringComparison.OrdinalIgnoreCase))
            {
                result.NextSteps = line.Substring("NEXT_STEPS:".Length).Trim();
                currentSection = "next_steps";
            }
            else if (currentSection == "solutions" && (line.StartsWith("1.") || line.StartsWith("2.") || line.StartsWith("3.") || line.StartsWith("-")))
            {
                var solution = line.TrimStart('1', '2', '3', '.', '-', ' ').Trim();
                if (!string.IsNullOrEmpty(solution))
                {
                    result.SuggestedSolutions.Add(solution);
                }
            }
        }

        // If parsing failed, use entire response as diagnosis
        if (string.IsNullOrEmpty(result.Diagnosis))
        {
            result.Diagnosis = response.Length > 200 ? response.Substring(0, 200) + "..." : response;
        }

        // Determine if manual intervention needed
        result.RequiresManualIntervention =
            response.Contains("manual", StringComparison.OrdinalIgnoreCase) ||
            response.Contains("contact", StringComparison.OrdinalIgnoreCase) ||
            result.SuggestedSolutions.Count == 0;

        return result;
    }

    private class OllamaResponse
    {
        public string? Response { get; set; }
    }
}
