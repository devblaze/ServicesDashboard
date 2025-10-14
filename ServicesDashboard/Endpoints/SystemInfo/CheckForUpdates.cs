using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services;

namespace ServicesDashboard.Endpoints.SystemInfo;

public class CheckForUpdatesEndpoint : EndpointWithoutRequest<UpdateInfo>
{
    private readonly IUpdateService _updateService;
    private readonly ILogger<CheckForUpdatesEndpoint> _logger;

    public CheckForUpdatesEndpoint(
        IUpdateService updateService,
        ILogger<CheckForUpdatesEndpoint> logger)
    {
        _updateService = updateService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/system/updates/check");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "Check for application updates";
            s.Description = "Checks GitHub releases for newer versions of the application";
            s.Response<UpdateInfo>(200, "Update information retrieved successfully");
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        try
        {
            var updateInfo = await _updateService.CheckForUpdatesAsync();
            await Send.OkAsync(updateInfo, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to check for updates");
            await Send.OkAsync(new UpdateInfo
            {
                CurrentVersion = _updateService.GetCurrentVersion(),
                LatestVersion = _updateService.GetCurrentVersion(),
                UpdateAvailable = false,
                Platform = _updateService.GetPlatform()
            }, ct);
        }
    }
}

public class GetCurrentVersionEndpoint : EndpointWithoutRequest<VersionInfo>
{
    private readonly IUpdateService _updateService;

    public GetCurrentVersionEndpoint(IUpdateService updateService)
    {
        _updateService = updateService;
    }

    public override void Configure()
    {
        Get("/api/system/version");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "Get current application version";
            s.Description = "Returns the currently running version and platform information";
            s.Response<VersionInfo>(200, "Version information retrieved successfully");
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var versionInfo = new VersionInfo
        {
            Version = _updateService.GetCurrentVersion(),
            Platform = _updateService.GetPlatform()
        };

        await Send.OkAsync(versionInfo, ct);
    }
}

public class VersionInfo
{
    public string Version { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
}
