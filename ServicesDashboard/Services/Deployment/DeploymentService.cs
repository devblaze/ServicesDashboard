using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Models.Dtos;
using System.Text.Json;

namespace ServicesDashboard.Services.Deployment;

public interface IDeploymentService
{
    Task<List<DeploymentDto>> GetAllAsync(int? serverId = null, int? repositoryId = null);
    Task<DeploymentDto?> GetByIdAsync(int id);
    Task<DeploymentDto> CreateAsync(CreateDeploymentRequest request);
    Task<DeploymentDto?> UpdateAsync(int id, UpdateDeploymentRequest request);
    Task<bool> DeleteAsync(int id);
    Task<ExecuteDeploymentResponse> ExecuteDeploymentAsync(int deploymentId, int? environmentId = null);
    Task<bool> StopDeploymentAsync(int deploymentId);

    // Environment management
    Task<DeploymentEnvironmentDto> CreateEnvironmentAsync(CreateDeploymentEnvironmentRequest request);
    Task<DeploymentEnvironmentDto?> GetEnvironmentByIdAsync(int id);
    Task<List<DeploymentEnvironmentDto>> GetAllEnvironmentsAsync(int deploymentId);
    Task<DeploymentEnvironmentDto?> UpdateEnvironmentAsync(int id, UpdateDeploymentEnvironmentRequest request);
    Task<bool> DeleteEnvironmentAsync(int id, int deploymentId);
}

public class DeploymentService : IDeploymentService
{
    private readonly ServicesDashboardContext _context;
    private readonly ILogger<DeploymentService> _logger;
    private readonly IPortAllocationService _portAllocationService;
    private readonly IDeploymentExecutor _deploymentExecutor;

    public DeploymentService(
        ServicesDashboardContext context,
        ILogger<DeploymentService> logger,
        IPortAllocationService portAllocationService,
        IDeploymentExecutor deploymentExecutor)
    {
        _context = context;
        _logger = logger;
        _portAllocationService = portAllocationService;
        _deploymentExecutor = deploymentExecutor;
    }

    public async Task<List<DeploymentDto>> GetAllAsync(int? serverId = null, int? repositoryId = null)
    {
        var query = _context.Deployments
            .Include(d => d.GitRepository)
                .ThenInclude(r => r.GitProviderConnection)
            .Include(d => d.Server)
            .Include(d => d.Environments)
            .Include(d => d.AllocatedPorts)
            .AsQueryable();

        if (serverId.HasValue)
            query = query.Where(d => d.ServerId == serverId.Value);

        if (repositoryId.HasValue)
            query = query.Where(d => d.GitRepositoryId == repositoryId.Value);

        var deployments = await query
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();

        return deployments.Select(MapToDto).ToList();
    }

    public async Task<DeploymentDto?> GetByIdAsync(int id)
    {
        var deployment = await _context.Deployments
            .Include(d => d.GitRepository)
                .ThenInclude(r => r.GitProviderConnection)
            .Include(d => d.Server)
            .Include(d => d.Environments)
            .Include(d => d.AllocatedPorts)
            .FirstOrDefaultAsync(d => d.Id == id);

        return deployment == null ? null : MapToDto(deployment);
    }

    public async Task<DeploymentDto> CreateAsync(CreateDeploymentRequest request)
    {
        var deployment = new Data.Entities.Deployment
        {
            GitRepositoryId = request.GitRepositoryId,
            ServerId = request.ServerId,
            Name = request.Name,
            Type = Enum.Parse<DeploymentType>(request.Type),
            Status = DeploymentStatus.Created,
            Branch = request.Branch,
            Tag = request.Tag,
            DockerComposeFile = request.DockerComposeFile,
            Dockerfile = request.Dockerfile,
            BuildContext = request.BuildContext ?? ".",
            EnvironmentVariables = request.EnvironmentVariables != null
                ? JsonSerializer.Serialize(request.EnvironmentVariables)
                : null,
            PortMappings = request.PortMappings != null
                ? JsonSerializer.Serialize(request.PortMappings)
                : null,
            VolumeMappings = request.VolumeMappings != null
                ? JsonSerializer.Serialize(request.VolumeMappings)
                : null,
            AutoDeploy = request.AutoDeploy
        };

        _context.Deployments.Add(deployment);
        await _context.SaveChangesAsync();

        // Allocate ports if port mappings are specified
        if (request.PortMappings != null && request.PortMappings.Any())
        {
            foreach (var portMapping in request.PortMappings)
            {
                await _portAllocationService.AllocatePortAsync(new AllocatePortRequest
                {
                    ServerId = request.ServerId,
                    DeploymentId = deployment.Id,
                    PreferredPort = portMapping.HostPort,
                    ServiceName = request.Name,
                    Description = $"Port for {request.Name}"
                });
            }
        }

        _logger.LogInformation("Created deployment: {Name} for repository {RepoId}", deployment.Name, deployment.GitRepositoryId);

        // Reload to include relationships
        return (await GetByIdAsync(deployment.Id))!;
    }

    public async Task<DeploymentDto?> UpdateAsync(int id, UpdateDeploymentRequest request)
    {
        var deployment = await _context.Deployments.FindAsync(id);
        if (deployment == null)
            return null;

        deployment.Name = request.Name;
        deployment.Branch = request.Branch;
        deployment.Tag = request.Tag;
        deployment.EnvironmentVariables = request.EnvironmentVariables != null
            ? JsonSerializer.Serialize(request.EnvironmentVariables)
            : null;
        deployment.PortMappings = request.PortMappings != null
            ? JsonSerializer.Serialize(request.PortMappings)
            : null;
        deployment.VolumeMappings = request.VolumeMappings != null
            ? JsonSerializer.Serialize(request.VolumeMappings)
            : null;
        deployment.AutoDeploy = request.AutoDeploy;
        deployment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated deployment: {Name}", deployment.Name);

        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var deployment = await _context.Deployments.FindAsync(id);
        if (deployment == null)
            return false;

        // Release allocated ports
        await _portAllocationService.ReleaseDeploymentPortsAsync(id);

        _context.Deployments.Remove(deployment);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted deployment: {Name}", deployment.Name);

        return true;
    }

    public async Task<ExecuteDeploymentResponse> ExecuteDeploymentAsync(int deploymentId, int? environmentId = null)
    {
        var deployment = await _context.Deployments
            .Include(d => d.GitRepository)
                .ThenInclude(r => r.GitProviderConnection)
            .Include(d => d.Server)
            .Include(d => d.Environments)
            .FirstOrDefaultAsync(d => d.Id == deploymentId);

        if (deployment == null)
        {
            return new ExecuteDeploymentResponse
            {
                Success = false,
                Message = "Deployment not found"
            };
        }

        try
        {
            deployment.Status = DeploymentStatus.Deploying;
            await _context.SaveChangesAsync();

            var result = await _deploymentExecutor.ExecuteAsync(deployment, environmentId);

            deployment.Status = result.Success ? DeploymentStatus.Running : DeploymentStatus.Failed;
            deployment.LastDeployedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing deployment {DeploymentId}", deploymentId);

            deployment.Status = DeploymentStatus.Failed;
            await _context.SaveChangesAsync();

            return new ExecuteDeploymentResponse
            {
                Success = false,
                Message = $"Deployment failed: {ex.Message}"
            };
        }
    }

    public async Task<bool> StopDeploymentAsync(int deploymentId)
    {
        var deployment = await _context.Deployments
            .Include(d => d.Server)
            .FirstOrDefaultAsync(d => d.Id == deploymentId);

        if (deployment == null)
            return false;

        try
        {
            await _deploymentExecutor.StopAsync(deployment);

            deployment.Status = DeploymentStatus.Stopped;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Stopped deployment {DeploymentId}", deploymentId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error stopping deployment {DeploymentId}", deploymentId);
            return false;
        }
    }

    // Environment management methods
    public async Task<DeploymentEnvironmentDto> CreateEnvironmentAsync(CreateDeploymentEnvironmentRequest request)
    {
        var environment = new DeploymentEnvironment
        {
            DeploymentId = request.DeploymentId,
            Name = request.Name,
            Type = Enum.Parse<EnvironmentType>(request.Type),
            EnvironmentVariables = request.EnvironmentVariables != null
                ? JsonSerializer.Serialize(request.EnvironmentVariables)
                : null,
            PortMappings = request.PortMappings != null
                ? JsonSerializer.Serialize(request.PortMappings)
                : null,
            Branch = request.Branch,
            Tag = request.Tag,
            IsActive = true
        };

        _context.DeploymentEnvironments.Add(environment);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created environment: {Name} for deployment {DeploymentId}", environment.Name, environment.DeploymentId);

        return MapEnvironmentToDto(environment);
    }

    public async Task<DeploymentEnvironmentDto?> GetEnvironmentByIdAsync(int id)
    {
        var environment = await _context.DeploymentEnvironments
            .FirstOrDefaultAsync(e => e.Id == id);

        return environment == null ? null : MapEnvironmentToDto(environment);
    }

    public async Task<List<DeploymentEnvironmentDto>> GetAllEnvironmentsAsync(int deploymentId)
    {
        var environments = await _context.DeploymentEnvironments
            .Where(e => e.DeploymentId == deploymentId)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();

        return environments.Select(MapEnvironmentToDto).ToList();
    }

    public async Task<DeploymentEnvironmentDto?> UpdateEnvironmentAsync(int id, UpdateDeploymentEnvironmentRequest request)
    {
        var environment = await _context.DeploymentEnvironments.FindAsync(id);
        if (environment == null)
            return null;

        environment.Name = request.Name;
        environment.EnvironmentVariables = request.EnvironmentVariables != null
            ? JsonSerializer.Serialize(request.EnvironmentVariables)
            : null;
        environment.PortMappings = request.PortMappings != null
            ? JsonSerializer.Serialize(request.PortMappings)
            : null;
        environment.Branch = request.Branch;
        environment.Tag = request.Tag;
        environment.IsActive = request.IsActive;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated environment: {Name}", environment.Name);

        return MapEnvironmentToDto(environment);
    }

    public async Task<bool> DeleteEnvironmentAsync(int id, int deploymentId)
    {
        var environment = await _context.DeploymentEnvironments
            .FirstOrDefaultAsync(e => e.Id == id && e.DeploymentId == deploymentId);

        if (environment == null)
            return false;

        _context.DeploymentEnvironments.Remove(environment);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted environment: {Name}", environment.Name);

        return true;
    }

    private DeploymentDto MapToDto(Data.Entities.Deployment deployment)
    {
        return new DeploymentDto
        {
            Id = deployment.Id,
            GitRepositoryId = deployment.GitRepositoryId,
            RepositoryName = deployment.GitRepository.Name,
            ServerId = deployment.ServerId,
            ServerName = deployment.Server.Name,
            Name = deployment.Name,
            Type = deployment.Type.ToString(),
            Status = deployment.Status.ToString(),
            Branch = deployment.Branch,
            Tag = deployment.Tag,
            DockerComposeFile = deployment.DockerComposeFile,
            Dockerfile = deployment.Dockerfile,
            BuildContext = deployment.BuildContext,
            EnvironmentVariables = deployment.EnvironmentVariables != null
                ? JsonSerializer.Deserialize<Dictionary<string, string>>(deployment.EnvironmentVariables)
                : null,
            PortMappings = deployment.PortMappings != null
                ? JsonSerializer.Deserialize<List<PortMappingDto>>(deployment.PortMappings)
                : null,
            VolumeMappings = deployment.VolumeMappings != null
                ? JsonSerializer.Deserialize<List<VolumeMappingDto>>(deployment.VolumeMappings)
                : null,
            AutoDeploy = deployment.AutoDeploy,
            DeploymentPath = deployment.DeploymentPath,
            AiSuggestions = deployment.AiSuggestions != null
                ? JsonSerializer.Deserialize<AiDeploymentSuggestions>(deployment.AiSuggestions)
                : null,
            LastDeployedAt = deployment.LastDeployedAt,
            CreatedAt = deployment.CreatedAt,
            Environments = deployment.Environments.Select(MapEnvironmentToDto).ToList(),
            AllocatedPorts = deployment.AllocatedPorts.Select(MapPortToDto).ToList()
        };
    }

    private DeploymentEnvironmentDto MapEnvironmentToDto(DeploymentEnvironment env)
    {
        return new DeploymentEnvironmentDto
        {
            Id = env.Id,
            DeploymentId = env.DeploymentId,
            Name = env.Name,
            Type = env.Type.ToString(),
            EnvironmentVariables = env.EnvironmentVariables != null
                ? JsonSerializer.Deserialize<Dictionary<string, string>>(env.EnvironmentVariables)
                : null,
            PortMappings = env.PortMappings != null
                ? JsonSerializer.Deserialize<List<PortMappingDto>>(env.PortMappings)
                : null,
            Branch = env.Branch,
            Tag = env.Tag,
            IsActive = env.IsActive,
            LastDeployedAt = env.LastDeployedAt,
            CreatedAt = env.CreatedAt
        };
    }

    private PortAllocationDto MapPortToDto(PortAllocation port)
    {
        return new PortAllocationDto
        {
            Id = port.Id,
            ServerId = port.ServerId,
            DeploymentId = port.DeploymentId,
            Port = port.Port,
            ServiceName = port.ServiceName,
            Description = port.Description,
            IsActive = port.IsActive,
            AllocatedAt = port.AllocatedAt
        };
    }
}
