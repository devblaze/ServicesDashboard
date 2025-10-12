using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Docker;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.DockerServices;

public class GetAllDockerServicesEndpoint : EndpointWithoutRequest<IEnumerable<DockerServiceWithServer>>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly IDockerServicesService _dockerServicesService;
    private readonly ILogger<GetAllDockerServicesEndpoint> _logger;

    public GetAllDockerServicesEndpoint(
        IServerManagementService serverManagementService,
        IDockerServicesService dockerServicesService,
        ILogger<GetAllDockerServicesEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _dockerServicesService = dockerServicesService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/dockerservices");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        try
        {
            var servers = await _serverManagementService.GetServersAsync();
            var allDockerServices = new List<DockerServiceWithServer>();

            // Fetch from all servers, not just online ones - containers might be on offline servers too
            foreach (var server in servers)
            {
                try
                {
                    var result = await _serverManagementService.DiscoverDockerServicesAsync(server.Id);
                    if (result.Success && result.Services != null)
                    {
                        var servicesWithServer = result.Services.Select(service => new DockerServiceWithServer
                        {
                            ContainerId = service.ContainerId,
                            Name = service.Name,
                            Image = service.Image,
                            Status = service.Status,
                            State = service.Status, // Use Status for State since DockerService doesn't have State
                            Ports = service.Ports?.Select(port => new DockerPortMapping
                            {
                                PrivatePort = port.ContainerPort,
                                PublicPort = port.HostPort,
                                Type = port.Protocol,
                                IP = port.HostIp ?? string.Empty
                            }).ToList() ?? new List<DockerPortMapping>(),
                            CreatedAt = service.CreatedAt,
                            ServerId = server.Id,
                            ServerName = server.Name,
                            ServerHostAddress = server.HostAddress,
                            Order = 0 // Will be set by arrangement service
                        });

                        allDockerServices.AddRange(servicesWithServer);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to get Docker services from server {ServerId}", server.Id);
                }
            }

            // Apply user arrangements
            var arrangedServices = await _dockerServicesService.ApplyArrangementsAsync(allDockerServices);

            await Send.OkAsync(arrangedServices, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all Docker services");
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
