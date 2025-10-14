using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Docker;

namespace ServicesDashboard.Endpoints.DockerServices;

public class UpdateDockerServiceIconEndpoint : Endpoint<UpdateDockerServiceIconRequest>
{
    private readonly IDockerServicesService _dockerServicesService;
    private readonly ILogger<UpdateDockerServiceIconEndpoint> _logger;

    public UpdateDockerServiceIconEndpoint(
        IDockerServicesService dockerServicesService,
        ILogger<UpdateDockerServiceIconEndpoint> logger)
    {
        _dockerServicesService = dockerServicesService;
        _logger = logger;
    }

    public override void Configure()
    {
        Put("/api/dockerservices/icon");
        AllowAnonymous();
    }

    public override async Task HandleAsync(UpdateDockerServiceIconRequest req, CancellationToken ct)
    {
        try
        {
            var success = await _dockerServicesService.UpdateServiceIconAsync(
                req.ServerId,
                req.ContainerId,
                req.IconUrl,
                req.IconData,
                req.RemoveBackground,
                req.DownloadFromUrl,
                req.ImageName
            );

            if (success)
            {
                await Send.OkAsync(new { message = "Icon updated successfully" }, ct);
            }
            else
            {
                HttpContext.Response.StatusCode = 500;
                await HttpContext.Response.WriteAsync(@"{""error"":""Failed to update icon""}", ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating Docker service icon");
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
        }
    }
}
