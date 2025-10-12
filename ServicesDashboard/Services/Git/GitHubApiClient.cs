using ServicesDashboard.Models.Dtos;
using System.Net.Http.Headers;
using System.Text.Json;

namespace ServicesDashboard.Services.Git;

public class GitHubApiClient : IGitApiClient
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;
    private readonly ILogger _logger;

    public GitHubApiClient(HttpClient httpClient, string baseUrl, string accessToken, ILogger logger)
    {
        _httpClient = httpClient;
        _baseUrl = baseUrl == "https://github.com" ? "https://api.github.com" : baseUrl;
        _logger = logger;

        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        _httpClient.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("ServicesDashboard", "1.0"));
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
    }

    public async Task<string> GetCurrentUserAsync()
    {
        var response = await _httpClient.GetAsync($"{_baseUrl}/user");
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(content);
        return json.RootElement.GetProperty("login").GetString() ?? "unknown";
    }

    public async Task<int> GetRepositoryCountAsync()
    {
        var response = await _httpClient.GetAsync($"{_baseUrl}/user");
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(content);
        return json.RootElement.GetProperty("public_repos").GetInt32();
    }

    public async Task<List<GitRepositoryInfo>> GetRepositoriesAsync()
    {
        var repositories = new List<GitRepositoryInfo>();
        var page = 1;
        const int perPage = 100;

        while (true)
        {
            var response = await _httpClient.GetAsync($"{_baseUrl}/user/repos?page={page}&per_page={perPage}&sort=updated");
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            var json = JsonDocument.Parse(content);
            var repos = json.RootElement.EnumerateArray().ToList();

            if (!repos.Any())
                break;

            foreach (var repo in repos)
            {
                repositories.Add(new GitRepositoryInfo
                {
                    Name = repo.GetProperty("name").GetString() ?? "",
                    FullName = repo.GetProperty("full_name").GetString() ?? "",
                    CloneUrl = repo.GetProperty("clone_url").GetString() ?? "",
                    WebUrl = repo.GetProperty("html_url").GetString(),
                    DefaultBranch = repo.GetProperty("default_branch").GetString(),
                    Description = repo.TryGetProperty("description", out var desc) ? desc.GetString() : null,
                    IsPrivate = repo.GetProperty("private").GetBoolean()
                });
            }

            if (repos.Count < perPage)
                break;

            page++;
        }

        return repositories;
    }

    public async Task<List<GitBranchDto>> GetBranchesAsync(string fullName)
    {
        var branches = new List<GitBranchDto>();
        var response = await _httpClient.GetAsync($"{_baseUrl}/repos/{fullName}/branches");
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(content);

        foreach (var branch in json.RootElement.EnumerateArray())
        {
            branches.Add(new GitBranchDto
            {
                Name = branch.GetProperty("name").GetString() ?? "",
                Sha = branch.GetProperty("commit").GetProperty("sha").GetString() ?? "",
                IsDefault = false // We'll need to check against repo default_branch
            });
        }

        return branches;
    }

    public async Task<string?> GetFileContentAsync(string fullName, string path, string? branch = null)
    {
        try
        {
            var url = $"{_baseUrl}/repos/{fullName}/contents/{path}";
            if (!string.IsNullOrEmpty(branch))
                url += $"?ref={branch}";

            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
                return null;

            var content = await response.Content.ReadAsStringAsync();
            var json = JsonDocument.Parse(content);

            if (json.RootElement.GetProperty("encoding").GetString() == "base64")
            {
                var base64Content = json.RootElement.GetProperty("content").GetString();
                if (base64Content != null)
                {
                    var bytes = Convert.FromBase64String(base64Content.Replace("\n", ""));
                    return System.Text.Encoding.UTF8.GetString(bytes);
                }
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get file content for {Path} in {Repo}", path, fullName);
            return null;
        }
    }
}
