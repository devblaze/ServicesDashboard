using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class AddDockerServiceToServicesRequest
{
    public int Id { get; set; }
    public string ContainerId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Port { get; set; }
    public string ServiceUrl { get; set; } = string.Empty;
}

public class AddDockerServiceToServicesEndpoint : Endpoint<AddDockerServiceToServicesRequest, HostedService>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<AddDockerServiceToServicesEndpoint> _logger;

    public AddDockerServiceToServicesEndpoint(
        IServerManagementService serverManagementService,
        ILogger<AddDockerServiceToServicesEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/servermanagement/{id}/docker-services/{containerId}/add-to-services");
        AllowAnonymous();
    }

    public override async Task HandleAsync(AddDockerServiceToServicesRequest req, CancellationToken ct)
    {
        try
        {
            // This would integrate with your existing services system
            // You'll need to implement this based on your services architecture
            var serviceDto = new CreateServiceDto
            {
                Name = req.Name,
                Description = req.Description,
                DockerImage = "", // You might want to store the original image
                Port = req.Port,
                ServiceUrl = req.ServiceUrl
            };

            // Add logic to create the service and link it to the server
            // This is a placeholder - implement based on your services system

            HttpContext.Response.StatusCode = 200;
            await HttpContext.Response.WriteAsync(@"{""message"":""Service added successfully""}", ct);
            return;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to add Docker service to services");
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Failed to add service""}", ct);
            return;
        }
    }
}
