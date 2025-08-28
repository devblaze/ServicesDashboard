namespace ServicesDashboard.Models;

public class HostedService
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string ContainerId { get; set; } = string.Empty;
    public bool IsDockerContainer { get; set; }
    public string Status { get; set; } = "Unknown";
    public DateTime LastChecked { get; set; }
    public DateTime DateAdded { get; set; }
    public int? ServerId { get; set; }
    public virtual ManagedServer? Server { get; set; }
    
    // Metadata field to store AI analysis data and other additional information
    public string? Metadata { get; set; }
}