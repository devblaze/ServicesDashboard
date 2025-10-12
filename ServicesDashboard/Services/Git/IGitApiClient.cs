using ServicesDashboard.Models.Dtos;

namespace ServicesDashboard.Services.Git;

public interface IGitApiClient
{
    Task<string> GetCurrentUserAsync();
    Task<int> GetRepositoryCountAsync();
    Task<List<GitRepositoryInfo>> GetRepositoriesAsync();
    Task<List<GitBranchDto>> GetBranchesAsync(string fullName);
    Task<string?> GetFileContentAsync(string fullName, string path, string? branch = null);
}

public class GitRepositoryInfo
{
    public string Name { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string CloneUrl { get; set; } = string.Empty;
    public string? WebUrl { get; set; }
    public string? DefaultBranch { get; set; }
    public string? Description { get; set; }
    public bool IsPrivate { get; set; }
}
