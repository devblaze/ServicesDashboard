using ServicesDashboard.Models.Dtos;
using System.Net.Http.Headers;
using System.Text.Json;

namespace ServicesDashboard.Services.Git;

public class GitLabApiClient : IGitApiClient
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;
    private readonly ILogger _logger;

    public GitLabApiClient(HttpClient httpClient, string baseUrl, string accessToken, ILogger logger)
    {
        _httpClient = httpClient;
        _baseUrl = baseUrl == "https://gitlab.com" ? "https://gitlab.com/api/v4" : $"{baseUrl}/api/v4";
        _logger = logger;

        _httpClient.DefaultRequestHeaders.Add("PRIVATE-TOKEN", accessToken);
    }

    public async Task<string> GetCurrentUserAsync()
    {
        var response = await _httpClient.GetAsync($"{_baseUrl}/user");
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(content);
        return json.RootElement.GetProperty("username").GetString() ?? "unknown";
    }

    public async Task<int> GetRepositoryCountAsync()
    {
        var response = await _httpClient.GetAsync($"{_baseUrl}/projects?owned=true&per_page=1");
        response.EnsureSuccessStatusCode();

        if (response.Headers.TryGetValues("X-Total", out var values))
        {
            return int.Parse(values.First());
        }

        return 0;
    }

    public async Task<List<GitRepositoryInfo>> GetRepositoriesAsync()
    {
        var repositories = new List<GitRepositoryInfo>();
        var page = 1;
        const int perPage = 100;

        while (true)
        {
            var response = await _httpClient.GetAsync($"{_baseUrl}/projects?owned=true&page={page}&per_page={perPage}");
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            var json = JsonDocument.Parse(content);
            var projects = json.RootElement.EnumerateArray().ToList();

            if (!projects.Any())
                break;

            foreach (var project in projects)
            {
                repositories.Add(new GitRepositoryInfo
                {
                    Name = project.GetProperty("name").GetString() ?? "",
                    FullName = project.GetProperty("path_with_namespace").GetString() ?? "",
                    CloneUrl = project.GetProperty("http_url_to_repo").GetString() ?? "",
                    WebUrl = project.GetProperty("web_url").GetString(),
                    DefaultBranch = project.GetProperty("default_branch").GetString(),
                    Description = project.TryGetProperty("description", out var desc) ? desc.GetString() : null,
                    IsPrivate = project.TryGetProperty("visibility", out var vis) && vis.GetString() == "private"
                });
            }

            if (projects.Count < perPage)
                break;

            page++;
        }

        return repositories;
    }

    public async Task<List<GitBranchDto>> GetBranchesAsync(string fullName)
    {
        var projectId = Uri.EscapeDataString(fullName);
        var branches = new List<GitBranchDto>();
        var response = await _httpClient.GetAsync($"{_baseUrl}/projects/{projectId}/repository/branches");
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(content);

        foreach (var branch in json.RootElement.EnumerateArray())
        {
            branches.Add(new GitBranchDto
            {
                Name = branch.GetProperty("name").GetString() ?? "",
                Sha = branch.GetProperty("commit").GetProperty("id").GetString() ?? "",
                IsDefault = branch.GetProperty("default").GetBoolean()
            });
        }

        return branches;
    }

    public async Task<string?> GetFileContentAsync(string fullName, string path, string? branch = null)
    {
        try
        {
            var projectId = Uri.EscapeDataString(fullName);
            var filePath = Uri.EscapeDataString(path);
            var url = $"{_baseUrl}/projects/{projectId}/repository/files/{filePath}/raw";

            if (!string.IsNullOrEmpty(branch))
                url += $"?ref={branch}";

            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
                return null;

            return await response.Content.ReadAsStringAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get file content for {Path} in {Repo}", path, fullName);
            return null;
        }
    }
}
