namespace ServicesDashboard.Models.Results;

public class CommandResult
{
    public string Output { get; set; } = string.Empty;
    public string Error { get; set; } = string.Empty;
    public int? ExitCode { get; set; }
    public DateTime ExecutedAt { get; set; }
}