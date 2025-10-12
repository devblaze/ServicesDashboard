using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Models.Dtos;
using System.Text.Json;

namespace ServicesDashboard.Services.Git;

public interface IGitProviderService
{
    Task<List<GitProviderConnectionDto>> GetAllAsync();
    Task<GitProviderConnectionDto?> GetByIdAsync(int id);
    Task<GitProviderConnectionDto> CreateAsync(CreateGitProviderConnectionRequest request);
    Task<GitProviderConnectionDto?> UpdateAsync(int id, UpdateGitProviderConnectionRequest request);
    Task<bool> DeleteAsync(int id);
    Task<TestGitProviderConnectionResponse> TestConnectionAsync(TestGitProviderConnectionRequest request);
}

public class GitProviderService : IGitProviderService
{
    private readonly ServicesDashboardContext _context;
    private readonly ILogger<GitProviderService> _logger;
    private readonly IGitApiClientFactory _gitApiClientFactory;

    public GitProviderService(
        ServicesDashboardContext context,
        ILogger<GitProviderService> logger,
        IGitApiClientFactory gitApiClientFactory)
    {
        _context = context;
        _logger = logger;
        _gitApiClientFactory = gitApiClientFactory;
    }

    public async Task<List<GitProviderConnectionDto>> GetAllAsync()
    {
        var connections = await _context.GitProviderConnections
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return connections.Select(MapToDto).ToList();
    }

    public async Task<GitProviderConnectionDto?> GetByIdAsync(int id)
    {
        var connection = await _context.GitProviderConnections.FindAsync(id);
        return connection == null ? null : MapToDto(connection);
    }

    public async Task<GitProviderConnectionDto> CreateAsync(CreateGitProviderConnectionRequest request)
    {
        // Encrypt the access token
        var encryptedToken = EncryptToken(request.AccessToken);

        var connection = new GitProviderConnection
        {
            Name = request.Name,
            ProviderType = Enum.Parse<GitProviderType>(request.ProviderType),
            BaseUrl = request.BaseUrl.TrimEnd('/'),
            AccessToken = encryptedToken,
            Username = request.Username,
            IsActive = true
        };

        _context.GitProviderConnections.Add(connection);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created Git provider connection: {Name} ({Type})", connection.Name, connection.ProviderType);

        return MapToDto(connection);
    }

    public async Task<GitProviderConnectionDto?> UpdateAsync(int id, UpdateGitProviderConnectionRequest request)
    {
        var connection = await _context.GitProviderConnections.FindAsync(id);
        if (connection == null)
            return null;

        connection.Name = request.Name;
        connection.BaseUrl = request.BaseUrl.TrimEnd('/');
        connection.Username = request.Username;
        connection.IsActive = request.IsActive;
        connection.UpdatedAt = DateTime.UtcNow;

        // Only update token if provided
        if (!string.IsNullOrEmpty(request.AccessToken))
        {
            connection.AccessToken = EncryptToken(request.AccessToken);
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated Git provider connection: {Name}", connection.Name);

        return MapToDto(connection);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var connection = await _context.GitProviderConnections.FindAsync(id);
        if (connection == null)
            return false;

        _context.GitProviderConnections.Remove(connection);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted Git provider connection: {Name}", connection.Name);

        return true;
    }

    public async Task<TestGitProviderConnectionResponse> TestConnectionAsync(TestGitProviderConnectionRequest request)
    {
        try
        {
            var providerType = Enum.Parse<GitProviderType>(request.ProviderType);
            var client = _gitApiClientFactory.CreateClient(providerType, request.BaseUrl, request.AccessToken);

            var user = await client.GetCurrentUserAsync();
            var repoCount = await client.GetRepositoryCountAsync();

            return new TestGitProviderConnectionResponse
            {
                Success = true,
                Message = "Connection successful!",
                Username = user,
                RepositoryCount = repoCount
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to test Git provider connection");
            return new TestGitProviderConnectionResponse
            {
                Success = false,
                Message = $"Connection failed: {ex.Message}"
            };
        }
    }

    private GitProviderConnectionDto MapToDto(GitProviderConnection connection)
    {
        return new GitProviderConnectionDto
        {
            Id = connection.Id,
            Name = connection.Name,
            ProviderType = connection.ProviderType.ToString(),
            BaseUrl = connection.BaseUrl,
            Username = connection.Username,
            IsActive = connection.IsActive,
            CreatedAt = connection.CreatedAt,
            UpdatedAt = connection.UpdatedAt
        };
    }

    private string EncryptToken(string token)
    {
        // TODO: Implement proper encryption using Data Protection API
        // For now, just store as-is (in production, MUST encrypt)
        return token;
    }

    private string DecryptToken(string encryptedToken)
    {
        // TODO: Implement proper decryption
        return encryptedToken;
    }
}
