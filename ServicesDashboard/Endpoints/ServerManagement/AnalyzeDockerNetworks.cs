using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class AnalyzeDockerNetworksRequest
{
    public int Id { get; set; }
}

public class AnalyzeDockerNetworksEndpoint : Endpoint<AnalyzeDockerNetworksRequest, DockerNetworkMigrationAnalysis>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<AnalyzeDockerNetworksEndpoint> _logger;

    public AnalyzeDockerNetworksEndpoint(
        IServerManagementService serverManagementService,
        ILogger<AnalyzeDockerNetworksEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/servermanagement/{id}/analyze-docker-networks");
        AllowAnonymous();
    }

    public override async Task HandleAsync(AnalyzeDockerNetworksRequest req, CancellationToken ct)
    {
        try
        {
            _logger.LogInformation("📊 Analyzing Docker networks for server {ServerId}", req.Id);

            var result = await _serverManagementService.AnalyzeDockerNetworksAsync(req.Id);

            await Send.OkAsync(result, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to analyze Docker networks for server {ServerId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsJsonAsync(new DockerNetworkMigrationAnalysis
            {
                ServerId = req.Id
            }, ct);
        }
    }
}
