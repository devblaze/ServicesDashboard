namespace ServicesDashboard.Services.AIAnalysis;

public class LogAnalysisResult
{
    public bool HasErrors { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> Suggestions { get; set; } = new();
}

public interface ILogAnalyzer
{
    Task<LogAnalysisResult> AnalyzeLogsAsync(string logs);
}