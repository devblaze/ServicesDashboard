namespace ServicesDashboard.Models.Results;

public class TerminalOutputResult
{
    public string Output { get; set; } = string.Empty;
    public bool SessionExists { get; set; }
    public DateTime CapturedAt { get; set; } = DateTime.UtcNow;
}
