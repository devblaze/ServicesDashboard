using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Services.Servers;
using DeploymentEntity = ServicesDashboard.Data.Entities.Deployment;

namespace ServicesDashboard.Services.SelfHosted;

public interface ISelfHostedServicesService
{
    Task<SelfHostedServicesResult> GetAllServicesAsync(SelfHostedServicesFilter? filter = null);
}

public class SelfHostedServicesService : ISelfHostedServicesService
{
    private readonly ServicesDashboardContext _context;
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<SelfHostedServicesService> _logger;

    public SelfHostedServicesService(
        ServicesDashboardContext context,
        IServerManagementService serverManagementService,
        ILogger<SelfHostedServicesService> logger)
    {
        _context = context;
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public async Task<SelfHostedServicesResult> GetAllServicesAsync(SelfHostedServicesFilter? filter = null)
    {
        var services = new List<SelfHostedServiceDto>();

        try
        {
            // Get all Docker containers
            var dockerServices = await GetDockerServicesAsync(filter);
            services.AddRange(dockerServices);

            // Get all Deployments
            var deploymentServices = await GetDeploymentServicesAsync(filter);
            services.AddRange(deploymentServices);

            // Apply additional filtering
            if (filter.HasValue && !string.IsNullOrWhiteSpace(filter.Value.SearchTerm))
            {
                var searchLower = filter.Value.SearchTerm.ToLower();
                services = services.Where(s =>
                    s.Name.ToLower().Contains(searchLower) ||
                    (s.ServerName?.ToLower().Contains(searchLower) ?? false) ||
                    (s.Tags?.Any(t => t.ToLower().Contains(searchLower)) ?? false)
                ).ToList();
            }

            return new SelfHostedServicesResult
            {
                Services = services,
                TotalCount = services.Count,
                Success = true
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get self-hosted services");
            return new SelfHostedServicesResult
            {
                Services = new List<SelfHostedServiceDto>(),
                TotalCount = 0,
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    private async Task<List<SelfHostedServiceDto>> GetDockerServicesAsync(SelfHostedServicesFilter? filter)
    {
        var services = new List<SelfHostedServiceDto>();

        // Get list of servers to query
        var servers = await _context.ManagedServers
            .Where(s => !filter.HasValue || !filter.Value.ServerId.HasValue || s.Id == filter.Value.ServerId.Value)
            .ToListAsync();

        foreach (var server in servers)
        {
            try
            {
                var discovery = await _serverManagementService.DiscoverDockerServicesAsync(server.Id);
                if (!discovery.Success)
                    continue;

                foreach (var dockerService in discovery.Services)
                {
                    // Apply status filter if specified
                    if (filter.HasValue && !string.IsNullOrWhiteSpace(filter.Value.Status))
                    {
                        var normalizedStatus = NormalizeDockerStatus(dockerService.Status);
                        if (!normalizedStatus.Equals(filter.Value.Status, StringComparison.OrdinalIgnoreCase))
                            continue;
                    }

                    services.Add(new SelfHostedServiceDto
                    {
                        Id = $"docker-{server.Id}-{dockerService.ContainerId}",
                        Type = "DockerContainer",
                        Name = dockerService.Name,
                        Status = NormalizeDockerStatus(dockerService.Status),
                        ServerId = server.Id,
                        ServerName = server.Name,
                        ContainerId = dockerService.ContainerId,
                        Image = dockerService.Image,
                        ImageTag = ExtractImageTag(dockerService.Image),
                        Ports = dockerService.Ports?.Select(p => new PortMappingDto
                        {
                            PrivatePort = p.ContainerPort,
                            PublicPort = p.HostPort,
                            Type = p.Protocol,
                            Ip = p.HostIp
                        }).ToList() ?? new List<PortMappingDto>(),
                        CreatedAt = dockerService.CreatedAt,
                        Tags = new List<string>(),
                        Url = dockerService.ServiceUrl
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to discover Docker services on server {ServerId}", server.Id);
            }
        }

        return services;
    }

    private async Task<List<SelfHostedServiceDto>> GetDeploymentServicesAsync(SelfHostedServicesFilter? filter)
    {
        var query = _context.Deployments
            .Include(d => d.GitRepository)
            .Include(d => d.Server)
            .Include(d => d.AllocatedPorts)
            .AsQueryable();

        // Apply server filter
        if (filter.HasValue && filter.Value.ServerId.HasValue)
        {
            query = query.Where(d => d.ServerId == filter.Value.ServerId.Value);
        }

        // Apply repository filter
        if (filter.HasValue && filter.Value.RepositoryId.HasValue)
        {
            query = query.Where(d => d.GitRepositoryId == filter.Value.RepositoryId.Value);
        }

        // Apply status filter
        if (filter.HasValue && !string.IsNullOrWhiteSpace(filter.Value.Status))
        {
            var statusEnum = Enum.Parse<DeploymentStatus>(filter.Value.Status, true);
            query = query.Where(d => d.Status == statusEnum);
        }

        var deployments = await query.ToListAsync();

        return deployments.Select(d => new SelfHostedServiceDto
        {
            Id = $"deployment-{d.ServerId}-{d.Id}",
            Type = "Deployment",
            Name = d.Name,
            Status = d.Status.ToString().ToLower(),
            ServerId = d.ServerId,
            ServerName = d.Server.Name,
            DeploymentId = d.Id,
            DeploymentType = d.Type.ToString(),
            Branch = d.Branch,
            RepositoryName = d.GitRepository?.Name,
            AutoDeploy = d.AutoDeploy,
            LastDeployedAt = d.LastDeployedAt,
            CreatedAt = d.CreatedAt,
            Tags = new List<string>(),
            Url = BuildDeploymentUrl(d)
        }).ToList();
    }

    private string NormalizeDockerStatus(string dockerStatus)
    {
        if (string.IsNullOrWhiteSpace(dockerStatus))
            return "unknown";

        var lower = dockerStatus.ToLower();
        if (lower.Contains("up") || lower.Contains("running"))
            return "running";
        if (lower.Contains("exited") || lower.Contains("stopped"))
            return "stopped";
        if (lower.Contains("restarting"))
            return "restarting";
        if (lower.Contains("paused"))
            return "paused";
        if (lower.Contains("dead"))
            return "failed";

        return "unknown";
    }

    private string ExtractImageTag(string image)
    {
        if (string.IsNullOrWhiteSpace(image))
            return "latest";

        var parts = image.Split(':');
        return parts.Length > 1 ? parts[^1] : "latest";
    }

    private string? BuildDeploymentUrl(DeploymentEntity deployment)
    {
        // Try to build URL from allocated ports
        var httpPort = deployment.AllocatedPorts
            ?.FirstOrDefault(p => p.Status == PortAllocationStatus.InUse);

        if (httpPort != null && !string.IsNullOrWhiteSpace(deployment.Server.HostAddress))
        {
            return $"http://{deployment.Server.HostAddress}:{httpPort.Port}";
        }

        return null;
    }
}

// DTOs
public class SelfHostedServiceDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int ServerId { get; set; }
    public string ServerName { get; set; } = string.Empty;

    // Docker-specific
    public string? ContainerId { get; set; }
    public string? Image { get; set; }
    public string? ImageTag { get; set; }
    public List<PortMappingDto>? Ports { get; set; }

    // Deployment-specific
    public int? DeploymentId { get; set; }
    public string? DeploymentType { get; set; }
    public string? Branch { get; set; }
    public string? RepositoryName { get; set; }
    public bool? AutoDeploy { get; set; }
    public DateTime? LastDeployedAt { get; set; }

    // Common
    public string? IconUrl { get; set; }
    public string? CustomIconData { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<string> Tags { get; set; } = new();
    public string? Url { get; set; }
}

public class PortMappingDto
{
    public int PrivatePort { get; set; }
    public int? PublicPort { get; set; }
    public string Type { get; set; } = "tcp";
    public string? Ip { get; set; }
}

public struct SelfHostedServicesFilter
{
    public string? Type { get; set; }
    public string? Status { get; set; }
    public int? ServerId { get; set; }
    public int? RepositoryId { get; set; }
    public string? SearchTerm { get; set; }
}

public class SelfHostedServicesResult
{
    public List<SelfHostedServiceDto> Services { get; set; } = new();
    public int TotalCount { get; set; }
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
}
