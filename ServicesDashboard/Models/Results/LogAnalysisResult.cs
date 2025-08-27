namespace ServicesDashboard.Models.Results;

public class LogAnalysisResult
{
    public string ServiceId { get; set; } = string.Empty;
    public IEnumerable<LogIssue> Issues { get; set; } = new List<LogIssue>();
    public string Summary { get; set; } = string.Empty;
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
    public List<string> Recommendations { get; set; } = new();
    public double Confidence { get; set; }
    public DateTime AnalyzedAt { get; set; }
}