using ServicesDashboard.Data.Entities;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Servers;
using System.Text;

namespace ServicesDashboard.Services.Deployment;

public interface IDeploymentExecutor
{
    Task<ExecuteDeploymentResponse> ExecuteAsync(Data.Entities.Deployment deployment, int? environmentId = null);
    Task StopAsync(Data.Entities.Deployment deployment);
}

public class DeploymentExecutor : IDeploymentExecutor
{
    private readonly IServerManagementService _serverManagement;
    private readonly ILogger<DeploymentExecutor> _logger;

    public DeploymentExecutor(IServerManagementService serverManagement, ILogger<DeploymentExecutor> logger)
    {
        _serverManagement = serverManagement;
        _logger = logger;
    }

    public async Task<ExecuteDeploymentResponse> ExecuteAsync(Data.Entities.Deployment deployment, int? environmentId = null)
    {
        var logs = new StringBuilder();

        try
        {
            _logger.LogInformation("Starting deployment {DeploymentId} ({Type})", deployment.Id, deployment.Type);

            var deployPath = deployment.DeploymentPath ?? $"/opt/deployments/{deployment.Name.ToLower().Replace(" ", "-")}";
            var branch = deployment.Branch ?? "main";

            // Step 1: Clone or pull repository
            logs.AppendLine($"=== Cloning repository to {deployPath} ===");
            var cloneResult = await CloneOrPullRepositoryAsync(deployment, deployPath, branch);
            logs.AppendLine(cloneResult);

            // Step 2: Execute deployment based on type
            logs.AppendLine($"\n=== Executing {deployment.Type} deployment ===");
            string deployResult = deployment.Type switch
            {
                DeploymentType.DockerCompose => await ExecuteDockerComposeAsync(deployment, deployPath),
                DeploymentType.Docker => await ExecuteDockerAsync(deployment, deployPath),
                DeploymentType.Kubernetes => await ExecuteKubernetesAsync(deployment, deployPath),
                DeploymentType.Script => await ExecuteScriptAsync(deployment, deployPath),
                _ => throw new NotSupportedException($"Deployment type {deployment.Type} not supported")
            };
            logs.AppendLine(deployResult);

            logs.AppendLine("\n=== Deployment completed successfully ===");

            return new ExecuteDeploymentResponse
            {
                Success = true,
                Message = "Deployment completed successfully",
                DeploymentLog = logs.ToString()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Deployment {DeploymentId} failed", deployment.Id);
            logs.AppendLine($"\n=== ERROR ===");
            logs.AppendLine(ex.Message);

            return new ExecuteDeploymentResponse
            {
                Success = false,
                Message = $"Deployment failed: {ex.Message}",
                DeploymentLog = logs.ToString()
            };
        }
    }

    public async Task StopAsync(Data.Entities.Deployment deployment)
    {
        var deployPath = deployment.DeploymentPath ?? $"/opt/deployments/{deployment.Name.ToLower().Replace(" ", "-")}";

        switch (deployment.Type)
        {
            case DeploymentType.DockerCompose:
                var composeFile = deployment.DockerComposeFile ?? "docker-compose.yml";
                await ExecuteSshCommandAsync(deployment.Server, $"cd {deployPath} && docker-compose -f {composeFile} down");
                break;

            case DeploymentType.Docker:
                var containerName = deployment.Name.ToLower().Replace(" ", "-");
                await ExecuteSshCommandAsync(deployment.Server, $"docker stop {containerName} && docker rm {containerName}");
                break;

            case DeploymentType.Kubernetes:
                await ExecuteSshCommandAsync(deployment.Server, $"kubectl delete -f {deployPath}");
                break;

            default:
                _logger.LogWarning("Stop not implemented for deployment type {Type}", deployment.Type);
                break;
        }
    }

    private async Task<string> CloneOrPullRepositoryAsync(Data.Entities.Deployment deployment, string deployPath, string branch)
    {
        var cloneUrl = deployment.GitRepository.CloneUrl;

        // Check if directory exists
        var checkDirCommand = $"test -d {deployPath} && echo 'exists' || echo 'not exists'";
        var dirCheck = await ExecuteSshCommandAsync(deployment.Server, checkDirCommand);

        if (dirCheck.Trim() == "exists")
        {
            // Pull latest changes
            var pullCommand = $"cd {deployPath} && git fetch origin && git checkout {branch} && git pull origin {branch}";
            return await ExecuteSshCommandAsync(deployment.Server, pullCommand);
        }
        else
        {
            // Clone repository
            var cloneCommand = $"mkdir -p {deployPath} && git clone -b {branch} {cloneUrl} {deployPath}";
            return await ExecuteSshCommandAsync(deployment.Server, cloneCommand);
        }
    }

    private async Task<string> ExecuteDockerComposeAsync(Data.Entities.Deployment deployment, string deployPath)
    {
        var composeFile = deployment.DockerComposeFile ?? "docker-compose.yml";
        var commands = new List<string>
        {
            $"cd {deployPath}",
            $"docker-compose -f {composeFile} pull",
            $"docker-compose -f {composeFile} down",
            $"docker-compose -f {composeFile} up -d"
        };

        return await ExecuteSshCommandAsync(deployment.Server, string.Join(" && ", commands));
    }

    private async Task<string> ExecuteDockerAsync(Data.Entities.Deployment deployment, string deployPath)
    {
        var dockerfile = deployment.Dockerfile ?? "Dockerfile";
        var buildContext = deployment.BuildContext ?? ".";
        var imageName = deployment.Name.ToLower().Replace(" ", "-");
        var containerName = imageName;

        var commands = new List<string>
        {
            $"cd {deployPath}/{buildContext}",
            $"docker build -f {dockerfile} -t {imageName} .",
            $"docker stop {containerName} || true",
            $"docker rm {containerName} || true",
            BuildDockerRunCommand(deployment, containerName, imageName)
        };

        return await ExecuteSshCommandAsync(deployment.Server, string.Join(" && ", commands));
    }

    private async Task<string> ExecuteKubernetesAsync(Data.Entities.Deployment deployment, string deployPath)
    {
        var commands = new List<string>
        {
            $"cd {deployPath}",
            $"kubectl apply -f ."
        };

        return await ExecuteSshCommandAsync(deployment.Server, string.Join(" && ", commands));
    }

    private async Task<string> ExecuteScriptAsync(Data.Entities.Deployment deployment, string deployPath)
    {
        // Look for deploy script
        var commands = new List<string>
        {
            $"cd {deployPath}",
            $"chmod +x deploy.sh",
            $"./deploy.sh"
        };

        return await ExecuteSshCommandAsync(deployment.Server, string.Join(" && ", commands));
    }

    private string BuildDockerRunCommand(Data.Entities.Deployment deployment, string containerName, string imageName)
    {
        var cmd = new StringBuilder($"docker run -d --name {containerName}");

        // Add port mappings
        if (!string.IsNullOrEmpty(deployment.PortMappings))
        {
            var portMappings = System.Text.Json.JsonSerializer.Deserialize<List<PortMappingDto>>(deployment.PortMappings);
            if (portMappings != null)
            {
                foreach (var port in portMappings)
                {
                    cmd.Append($" -p {port.HostPort}:{port.ContainerPort}");
                }
            }
        }

        // Add environment variables
        if (!string.IsNullOrEmpty(deployment.EnvironmentVariables))
        {
            var envVars = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(deployment.EnvironmentVariables);
            if (envVars != null)
            {
                foreach (var env in envVars)
                {
                    cmd.Append($" -e {env.Key}={env.Value}");
                }
            }
        }

        // Add volume mappings
        if (!string.IsNullOrEmpty(deployment.VolumeMappings))
        {
            var volumeMappings = System.Text.Json.JsonSerializer.Deserialize<List<VolumeMappingDto>>(deployment.VolumeMappings);
            if (volumeMappings != null)
            {
                foreach (var volume in volumeMappings)
                {
                    cmd.Append($" -v {volume.HostPath}:{volume.ContainerPath}:{volume.Mode}");
                }
            }
        }

        cmd.Append($" {imageName}");

        return cmd.ToString();
    }

    private async Task<string> ExecuteSshCommandAsync(ManagedServer server, string command)
    {
        var result = await _serverManagement.ExecuteCommandAsync(server.Id, command);
        return result.Output ?? string.Empty;
    }
}
