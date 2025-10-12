using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Docker;

namespace ServicesDashboard.Endpoints.DockerServices;

public class UpdateArrangementsEndpoint : Endpoint<List<DockerServiceArrangementDto>>
{
    private readonly IDockerServicesService _dockerServicesService;
    private readonly ILogger<UpdateArrangementsEndpoint> _logger;

    public UpdateArrangementsEndpoint(
        IDockerServicesService dockerServicesService,
        ILogger<UpdateArrangementsEndpoint> logger)
    {
        _dockerServicesService = dockerServicesService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/dockerservices/arrange");
        AllowAnonymous();
    }

    public override async Task HandleAsync(List<DockerServiceArrangementDto> req, CancellationToken ct)
    {
        try
        {
            await _dockerServicesService.UpdateArrangementsAsync(req);
            await Send.OkAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating Docker service arrangements");
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
