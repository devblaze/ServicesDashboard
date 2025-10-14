using System.Reflection;
using System.Runtime.InteropServices;
using System.Text.Json;
using ServicesDashboard.Models;

namespace ServicesDashboard.Services;

public interface IUpdateService
{
    Task<UpdateInfo> CheckForUpdatesAsync();
    string GetCurrentVersion();
    string GetPlatform();
}

public class UpdateService : IUpdateService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<UpdateService> _logger;
    private readonly IConfiguration _configuration;
    private const string GitHubApiUrl = "https://api.github.com/repos/{0}/{1}/releases/latest";

    public UpdateService(
        IHttpClientFactory httpClientFactory,
        ILogger<UpdateService> logger,
        IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _configuration = configuration;
    }

    public string GetCurrentVersion()
    {
        var version = Assembly.GetExecutingAssembly()
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion ?? "0.0.1";

        // Remove any +metadata suffix (like +abc123)
        var plusIndex = version.IndexOf('+');
        if (plusIndex > 0)
        {
            version = version.Substring(0, plusIndex);
        }

        return version;
    }

    public string GetPlatform()
    {
        var arch = RuntimeInformation.ProcessArchitecture;
        var os = RuntimeInformation.IsOSPlatform(OSPlatform.Linux) ? "linux" :
                 RuntimeInformation.IsOSPlatform(OSPlatform.OSX) ? "macos" :
                 RuntimeInformation.IsOSPlatform(OSPlatform.Windows) ? "windows" : "unknown";

        // Detect specific ARM variants for Raspberry Pi
        if (os == "linux" && (arch == Architecture.Arm || arch == Architecture.Arm64))
        {
            try
            {
                // Check for Pi Zero (ARMv6)
                var cpuInfo = File.ReadAllText("/proc/cpuinfo");
                if (cpuInfo.Contains("ARMv6") || cpuInfo.Contains("BCM2835"))
                {
                    return "pizero-linux-arm";
                }
                else if (arch == Architecture.Arm64)
                {
                    return "pi-linux-arm64";
                }
                else
                {
                    return "pi-linux-arm";
                }
            }
            catch
            {
                // Fallback to generic ARM detection
                return arch == Architecture.Arm64 ? "linux-arm64" : "linux-arm";
            }
        }

        return arch switch
        {
            Architecture.X64 => $"{os}-x64",
            Architecture.Arm64 when os == "macos" => "macos-arm64",
            Architecture.Arm64 => $"{os}-arm64",
            Architecture.Arm => $"{os}-arm",
            _ => $"{os}-{arch.ToString().ToLower()}"
        };
    }

    public async Task<UpdateInfo> CheckForUpdatesAsync()
    {
        var currentVersion = GetCurrentVersion();
        var platform = GetPlatform();

        var updateInfo = new UpdateInfo
        {
            CurrentVersion = currentVersion,
            LatestVersion = currentVersion,
            UpdateAvailable = false,
            Platform = platform
        };

        try
        {
            // Get repository info from configuration or use default
            var repoOwner = _configuration["GitHub:RepositoryOwner"] ?? "nickantoniadis";
            var repoName = _configuration["GitHub:RepositoryName"] ?? "ServicesDashboard";

            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("User-Agent", "ServicesDashboard");
            client.DefaultRequestHeaders.Add("Accept", "application/vnd.github.v3+json");

            var url = string.Format(GitHubApiUrl, repoOwner, repoName);
            _logger.LogInformation("Checking for updates at {Url}", url);

            var response = await client.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to check for updates. Status: {Status}", response.StatusCode);
                return updateInfo;
            }

            var content = await response.Content.ReadAsStringAsync();
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
            };

            var release = JsonSerializer.Deserialize<GitHubRelease>(content, options);

            if (release == null)
            {
                _logger.LogWarning("Failed to deserialize GitHub release response");
                return updateInfo;
            }

            updateInfo.LatestVersion = release.TagName.TrimStart('v');
            updateInfo.ReleaseNotes = release.Body;
            updateInfo.PublishedAt = release.PublishedAt;
            updateInfo.IsPrerelease = release.Prerelease;

            // Find the asset for the current platform
            var assetName = $"servicesdashboard-{platform}.tar.gz";
            if (platform.Contains("windows"))
            {
                assetName = $"servicesdashboard-{platform}.zip";
            }

            var asset = release.Assets.FirstOrDefault(a => a.Name == assetName);
            if (asset != null)
            {
                updateInfo.DownloadUrl = asset.BrowserDownloadUrl;
            }

            // Compare versions
            updateInfo.UpdateAvailable = IsNewerVersion(currentVersion, updateInfo.LatestVersion);

            _logger.LogInformation(
                "Update check complete. Current: {Current}, Latest: {Latest}, Available: {Available}",
                currentVersion, updateInfo.LatestVersion, updateInfo.UpdateAvailable);

            return updateInfo;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking for updates");
            return updateInfo;
        }
    }

    private bool IsNewerVersion(string current, string latest)
    {
        try
        {
            // Remove 'v' prefix if present
            current = current.TrimStart('v');
            latest = latest.TrimStart('v');

            // Parse versions (handle versions like "0.0.1" or "0.0.1-build.10")
            var currentParts = current.Split(new[] { '.', '-' }, StringSplitOptions.RemoveEmptyEntries);
            var latestParts = latest.Split(new[] { '.', '-' }, StringSplitOptions.RemoveEmptyEntries);

            for (int i = 0; i < Math.Min(3, Math.Min(currentParts.Length, latestParts.Length)); i++)
            {
                if (int.TryParse(currentParts[i], out var currentNum) &&
                    int.TryParse(latestParts[i], out var latestNum))
                {
                    if (latestNum > currentNum) return true;
                    if (latestNum < currentNum) return false;
                }
            }

            return false;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error comparing versions {Current} and {Latest}", current, latest);
            return false;
        }
    }
}
