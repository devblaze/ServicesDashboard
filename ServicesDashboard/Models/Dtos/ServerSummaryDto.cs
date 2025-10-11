namespace ServicesDashboard.Models.Dtos;

public class ServerSummaryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string HostAddress { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public DateTime? LastCheckTime { get; set; }
    public int? ParentServerId { get; set; }
    public string? ParentServerName { get; set; }
    public int ChildServerCount { get; set; }
}
