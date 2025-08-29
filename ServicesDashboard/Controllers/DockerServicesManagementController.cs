using Microsoft.AspNetCore.Mvc;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Docker;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DockerServicesController : ControllerBase
{
    private readonly IServerManagementService _serverManagementService;
    private readonly IDockerServicesService _dockerServicesService;
    private readonly ILogger<DockerServicesController> _logger;

    public DockerServicesController(
        IServerManagementService serverManagementService,
        IDockerServicesService dockerServicesService,
        ILogger<DockerServicesController> logger)
    {
        _serverManagementService = serverManagementService;
        _dockerServicesService = dockerServicesService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<DockerServiceWithServer>>> GetAllDockerServices()
    {
        try
        {
            var servers = await _serverManagementService.GetServersAsync();
            var allDockerServices = new List<DockerServiceWithServer>();

            foreach (var server in servers.Where(s => s.Status == ServerStatus.Online))
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
            
            return Ok(arrangedServices);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all Docker services");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("arrange")]
    public async Task<ActionResult> UpdateArrangements([FromBody] List<DockerServiceArrangementDto> arrangements)
    {
        try
        {
            await _dockerServicesService.UpdateArrangementsAsync(arrangements);
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating Docker service arrangements");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("{serverId}/containers/{containerId}/start")]
    public async Task<ActionResult> StartContainer(int serverId, string containerId)
    {
        try
        {
            var success = await _serverManagementService.StartDockerContainerAsync(serverId, containerId);
            return success ? Ok() : BadRequest("Failed to start container");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting container {ContainerId} on server {ServerId}", containerId, serverId);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("{serverId}/containers/{containerId}/stop")]
    public async Task<ActionResult> StopContainer(int serverId, string containerId)
    {
        try
        {
            var success = await _serverManagementService.StopDockerContainerAsync(serverId, containerId);
            return success ? Ok() : BadRequest("Failed to stop container");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error stopping container {ContainerId} on server {ServerId}", containerId, serverId);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("{serverId}/containers/{containerId}/restart")]
    public async Task<ActionResult> RestartContainer(int serverId, string containerId)
    {
        try
        {
            var success = await _serverManagementService.RestartDockerContainerAsync(serverId, containerId);
            return success ? Ok() : BadRequest("Failed to restart container");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error restarting container {ContainerId} on server {ServerId}", containerId, serverId);
            return StatusCode(500, "Internal server error");
        }
    }
}