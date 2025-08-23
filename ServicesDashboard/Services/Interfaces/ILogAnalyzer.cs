using ServicesDashboard.Models;

namespace ServicesDashboard.Services;

public class LogAnalysisResult
{
    public bool HasErrors { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> Suggestions { get; set; } = new();
    public IEnumerable<LogIssue> Issues { get; set; } = new List<LogIssue>();
    public string Summary { get; set; } = string.Empty;
}

public interface ILogAnalyzer
{
    Task<LogAnalysisResult> AnalyzeLogsAsync(string logs);
}