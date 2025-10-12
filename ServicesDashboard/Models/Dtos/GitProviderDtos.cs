namespace ServicesDashboard.Models.Dtos;

// Git Provider DTOs
public class GitProviderConnectionDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ProviderType { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = string.Empty;
    public string? Username { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateGitProviderConnectionRequest
{
    public string Name { get; set; } = string.Empty;
    public string ProviderType { get; set; } = string.Empty; // GitHub, GitLab, Gitea
    public string BaseUrl { get; set; } = string.Empty;
    public string AccessToken { get; set; } = string.Empty;
    public string? Username { get; set; }
}

public class UpdateGitProviderConnectionRequest
{
    public string Name { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = string.Empty;
    public string? AccessToken { get; set; } // Optional - only update if provided
    public string? Username { get; set; }
    public bool IsActive { get; set; }
}

public class TestGitProviderConnectionRequest
{
    public string ProviderType { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = string.Empty;
    public string AccessToken { get; set; } = string.Empty;
}

public class TestGitProviderConnectionResponse
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string? Username { get; set; }
    public int? RepositoryCount { get; set; }
}
