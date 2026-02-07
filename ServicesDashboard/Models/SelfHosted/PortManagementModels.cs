using ServicesDashboard.Data.Entities;

namespace ServicesDashboard.Models.SelfHosted;

// DTOs for port management operations
public class PortConflict
{
    public int Port { get; set; }
    public string ConflictType { get; set; } = string.Empty; // "System Reserved", "Already Allocated", "Docker Container"
    public string ConflictsWith { get; set; } = string.Empty; // Service name or "System"
}

public class PortConflictResult
{
    public bool HasConflicts { get; set; }
    public List<PortConflict> Conflicts { get; set; } = new List<PortConflict>();
    public List<int> SuggestedPorts { get; set; } = new List<int>();
}

public class PortSuggestionRequest
{
    public int ServerId { get; set; }
    public int Count { get; set; } = 1;
    public int? PreferredRangeStart { get; set; }
    public int? PreferredRangeEnd { get; set; }
}

public class PortAllocationRequest
{
    public int ServerId { get; set; }
    public int Port { get; set; }
    public PortAllocationType AllocationType { get; set; }
    public string? ServiceId { get; set; }
    public string? ServiceName { get; set; }
}
