namespace ServicesDashboard.Models;

public class ErrorContext
{
    public string Operation { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
    public string? CommandExecuted { get; set; }
    public string? CommandOutput { get; set; }
    public string? ServerOs { get; set; }
    public int? ServerId { get; set; }
    public Dictionary<string, string> AdditionalContext { get; set; } = new();
}

public class AIErrorAnalysisResult
{
    public string Diagnosis { get; set; } = string.Empty;
    public List<string> SuggestedSolutions { get; set; } = new();
    public string? NextSteps { get; set; }
    public bool RequiresManualIntervention { get; set; }
    public string? DocumentationUrl { get; set; }
    public DateTime AnalyzedAt { get; set; } = DateTime.UtcNow;
}

public class ErrorNotification
{
    public int Id { get; set; }
    public int? ServerId { get; set; }
    public string Operation { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
    public string? AIAnalysis { get; set; }
    public List<string> SuggestedSolutions { get; set; } = new();
    public bool IsResolved { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
    public string? Resolution { get; set; }
}
