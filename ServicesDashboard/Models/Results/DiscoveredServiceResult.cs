namespace ServicesDashboard.Models.Results;

public class DiscoveredServiceResult
{
    public string HostAddress { get; set; } = string.Empty;
    public string HostName { get; set; } = string.Empty;
    public int Port { get; set; }
    public bool IsReachable { get; set; }
    public TimeSpan ResponseTime { get; set; }
    public string ServiceType { get; set; } = string.Empty;
    public string? Banner { get; set; }
    public DateTime DiscoveredAt { get; set; }
    
    // AI Recognition fields
    public string? RecognizedName { get; set; }
    public string? SuggestedDescription { get; set; }
    public string? ServiceCategory { get; set; }
    public string? SuggestedIcon { get; set; }
    public double? AiConfidence { get; set; }

    // Service-specific flags
    public bool IsSshService => Port == 22 || ServiceType?.Contains("SSH", StringComparison.OrdinalIgnoreCase) == true;
    public bool CanAddAsServer => IsSshService && IsReachable;
}