using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Models.Dtos;

namespace ServicesDashboard.Services.Git;

public interface IGitRepositoryService
{
    Task<List<GitRepositoryDto>> GetAllAsync(int? gitProviderConnectionId = null);
    Task<GitRepositoryDto?> GetByIdAsync(int id);
    Task<SyncRepositoriesResponse> SyncRepositoriesAsync(int gitProviderConnectionId);
    Task<List<GitBranchDto>> GetBranchesAsync(int repositoryId);
    Task<bool> DeleteAsync(int id);
}

public class GitRepositoryService : IGitRepositoryService
{
    private readonly ServicesDashboardContext _context;
    private readonly ILogger<GitRepositoryService> _logger;
    private readonly IGitApiClientFactory _gitApiClientFactory;

    public GitRepositoryService(
        ServicesDashboardContext context,
        ILogger<GitRepositoryService> logger,
        IGitApiClientFactory gitApiClientFactory)
    {
        _context = context;
        _logger = logger;
        _gitApiClientFactory = gitApiClientFactory;
    }

    public async Task<List<GitRepositoryDto>> GetAllAsync(int? gitProviderConnectionId = null)
    {
        var query = _context.GitRepositories
            .Include(r => r.GitProviderConnection)
            .AsQueryable();

        if (gitProviderConnectionId.HasValue)
        {
            query = query.Where(r => r.GitProviderConnectionId == gitProviderConnectionId.Value);
        }

        var repositories = await query
            .OrderBy(r => r.Name)
            .ToListAsync();

        return repositories.Select(MapToDto).ToList();
    }

    public async Task<GitRepositoryDto?> GetByIdAsync(int id)
    {
        var repository = await _context.GitRepositories
            .Include(r => r.GitProviderConnection)
            .FirstOrDefaultAsync(r => r.Id == id);

        return repository == null ? null : MapToDto(repository);
    }

    public async Task<SyncRepositoriesResponse> SyncRepositoriesAsync(int gitProviderConnectionId)
    {
        var response = new SyncRepositoriesResponse();

        try
        {
            var connection = await _context.GitProviderConnections.FindAsync(gitProviderConnectionId);
            if (connection == null)
            {
                response.Errors.Add("Git provider connection not found");
                return response;
            }

            var client = _gitApiClientFactory.CreateClient(
                connection.ProviderType,
                connection.BaseUrl,
                connection.AccessToken
            );

            var remoteRepos = await client.GetRepositoriesAsync();
            var existingRepos = await _context.GitRepositories
                .Where(r => r.GitProviderConnectionId == gitProviderConnectionId)
                .ToListAsync();

            var existingRepoDict = existingRepos.ToDictionary(r => r.FullName);

            foreach (var remoteRepo in remoteRepos)
            {
                if (existingRepoDict.TryGetValue(remoteRepo.FullName, out var existingRepo))
                {
                    // Update existing repository
                    existingRepo.CloneUrl = remoteRepo.CloneUrl;
                    existingRepo.WebUrl = remoteRepo.WebUrl;
                    existingRepo.DefaultBranch = remoteRepo.DefaultBranch;
                    existingRepo.Description = remoteRepo.Description;
                    existingRepo.IsPrivate = remoteRepo.IsPrivate;
                    existingRepo.LastSyncedAt = DateTime.UtcNow;
                    existingRepo.UpdatedAt = DateTime.UtcNow;
                    response.UpdatedRepositories++;
                }
                else
                {
                    // Add new repository
                    var newRepo = new GitRepository
                    {
                        GitProviderConnectionId = gitProviderConnectionId,
                        Name = remoteRepo.Name,
                        FullName = remoteRepo.FullName,
                        CloneUrl = remoteRepo.CloneUrl,
                        WebUrl = remoteRepo.WebUrl,
                        DefaultBranch = remoteRepo.DefaultBranch,
                        Description = remoteRepo.Description,
                        IsPrivate = remoteRepo.IsPrivate,
                        LastSyncedAt = DateTime.UtcNow
                    };

                    _context.GitRepositories.Add(newRepo);
                    response.NewRepositories++;
                }
            }

            await _context.SaveChangesAsync();
            response.TotalRepositories = remoteRepos.Count;

            _logger.LogInformation(
                "Synced repositories for provider {ProviderId}: {New} new, {Updated} updated, {Total} total",
                gitProviderConnectionId, response.NewRepositories, response.UpdatedRepositories, response.TotalRepositories
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error syncing repositories for provider {ProviderId}", gitProviderConnectionId);
            response.Errors.Add($"Sync failed: {ex.Message}");
        }

        return response;
    }

    public async Task<List<GitBranchDto>> GetBranchesAsync(int repositoryId)
    {
        var repository = await _context.GitRepositories
            .Include(r => r.GitProviderConnection)
            .FirstOrDefaultAsync(r => r.Id == repositoryId);

        if (repository == null)
            return new List<GitBranchDto>();

        var client = _gitApiClientFactory.CreateClient(
            repository.GitProviderConnection.ProviderType,
            repository.GitProviderConnection.BaseUrl,
            repository.GitProviderConnection.AccessToken
        );

        var branches = await client.GetBranchesAsync(repository.FullName);

        // Mark the default branch
        var defaultBranch = repository.DefaultBranch;
        foreach (var branch in branches)
        {
            if (branch.Name == defaultBranch)
                branch.IsDefault = true;
        }

        return branches;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var repository = await _context.GitRepositories.FindAsync(id);
        if (repository == null)
            return false;

        _context.GitRepositories.Remove(repository);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted repository: {Name}", repository.Name);

        return true;
    }

    private GitRepositoryDto MapToDto(GitRepository repository)
    {
        return new GitRepositoryDto
        {
            Id = repository.Id,
            GitProviderConnectionId = repository.GitProviderConnectionId,
            ProviderName = repository.GitProviderConnection.Name,
            Name = repository.Name,
            FullName = repository.FullName,
            CloneUrl = repository.CloneUrl,
            WebUrl = repository.WebUrl,
            DefaultBranch = repository.DefaultBranch,
            Description = repository.Description,
            IsPrivate = repository.IsPrivate,
            LastSyncedAt = repository.LastSyncedAt,
            CreatedAt = repository.CreatedAt
        };
    }
}
