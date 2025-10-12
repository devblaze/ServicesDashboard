using ServicesDashboard.Data.Entities;

namespace ServicesDashboard.Services.Git;

public interface IGitApiClientFactory
{
    IGitApiClient CreateClient(GitProviderType type, string baseUrl, string accessToken);
}

public class GitApiClientFactory : IGitApiClientFactory
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<GitApiClientFactory> _logger;

    public GitApiClientFactory(IHttpClientFactory httpClientFactory, ILogger<GitApiClientFactory> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public IGitApiClient CreateClient(GitProviderType type, string baseUrl, string accessToken)
    {
        var httpClient = _httpClientFactory.CreateClient();

        return type switch
        {
            GitProviderType.GitHub => new GitHubApiClient(httpClient, baseUrl, accessToken, _logger),
            GitProviderType.GitLab => new GitLabApiClient(httpClient, baseUrl, accessToken, _logger),
            GitProviderType.Gitea => new GiteaApiClient(httpClient, baseUrl, accessToken, _logger),
            _ => throw new ArgumentException($"Unsupported provider type: {type}")
        };
    }
}
