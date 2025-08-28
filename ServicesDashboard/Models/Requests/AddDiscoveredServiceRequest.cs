namespace ServicesDashboard.Models.Requests;

public class AddDiscoveredServiceRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string HostAddress { get; set; } = string.Empty;
    public int Port { get; set; }
    public string ServiceType { get; set; } = string.Empty;
    public string? Banner { get; set; }
    
    // AI Recognition properties
    public string? RecognizedName { get; set; }
    public string? SuggestedDescription { get; set; }
    public string? ServiceCategory { get; set; }
    public string? SuggestedIcon { get; set; }
    public double? AiConfidence { get; set; }
}