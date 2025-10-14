namespace ServicesDashboard.Models;

public class UpdateInfo
{
    public string CurrentVersion { get; set; } = string.Empty;
    public string LatestVersion { get; set; } = string.Empty;
    public bool UpdateAvailable { get; set; }
    public string? ReleaseNotes { get; set; }
    public string? DownloadUrl { get; set; }
    public DateTime? PublishedAt { get; set; }
    public string? Platform { get; set; }
    public bool IsPrerelease { get; set; }
}

public class GitHubRelease
{
    public string TagName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public DateTime PublishedAt { get; set; }
    public bool Prerelease { get; set; }
    public List<GitHubAsset> Assets { get; set; } = new();
}

public class GitHubAsset
{
    public string Name { get; set; } = string.Empty;
    public string BrowserDownloadUrl { get; set; } = string.Empty;
    public long Size { get; set; }
}
