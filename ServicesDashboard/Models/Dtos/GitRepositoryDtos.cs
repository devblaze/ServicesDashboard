namespace ServicesDashboard.Models.Dtos;

// Git Repository DTOs
public class GitRepositoryDto
{
    public int Id { get; set; }
    public int GitProviderConnectionId { get; set; }
    public string ProviderName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string CloneUrl { get; set; } = string.Empty;
    public string? WebUrl { get; set; }
    public string? DefaultBranch { get; set; }
    public string? Description { get; set; }
    public bool IsPrivate { get; set; }
    public DateTime? LastSyncedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SyncRepositoriesRequest
{
    public int GitProviderConnectionId { get; set; }
}

public class SyncRepositoriesResponse
{
    public int NewRepositories { get; set; }
    public int UpdatedRepositories { get; set; }
    public int TotalRepositories { get; set; }
    public List<string> Errors { get; set; } = new();
}

public class GitBranchDto
{
    public string Name { get; set; } = string.Empty;
    public string Sha { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
}

public class GetRepositoryBranchesRequest
{
    public int RepositoryId { get; set; }
}
