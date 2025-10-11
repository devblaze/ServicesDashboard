namespace ServicesDashboard.Models.Results;

public class TmuxAvailabilityResult
{
    public bool IsAvailable { get; set; }
    public string? Version { get; set; }
    public string? Message { get; set; }
}
