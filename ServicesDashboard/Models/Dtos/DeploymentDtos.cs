namespace ServicesDashboard.Models.Dtos;

// Deployment DTOs
public class DeploymentDto
{
    public int Id { get; set; }
    public int GitRepositoryId { get; set; }
    public string RepositoryName { get; set; } = string.Empty;
    public int ServerId { get; set; }
    public string ServerName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Branch { get; set; }
    public string? Tag { get; set; }
    public string? DockerComposeFile { get; set; }
    public string? Dockerfile { get; set; }
    public string? BuildContext { get; set; }
    public Dictionary<string, string>? EnvironmentVariables { get; set; }
    public List<PortMappingDto>? PortMappings { get; set; }
    public List<VolumeMappingDto>? VolumeMappings { get; set; }
    public bool AutoDeploy { get; set; }
    public string? DeploymentPath { get; set; }
    public AiDeploymentSuggestions? AiSuggestions { get; set; }
    public DateTime? LastDeployedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<DeploymentEnvironmentDto> Environments { get; set; } = new();
    public List<PortAllocationDto> AllocatedPorts { get; set; } = new();
}

public class CreateDeploymentRequest
{
    public int GitRepositoryId { get; set; }
    public int ServerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // DockerCompose, Docker, Kubernetes, Script
    public string? Branch { get; set; }
    public string? Tag { get; set; }
    public string? DockerComposeFile { get; set; }
    public string? Dockerfile { get; set; }
    public string? BuildContext { get; set; }
    public Dictionary<string, string>? EnvironmentVariables { get; set; }
    public List<PortMappingDto>? PortMappings { get; set; }
    public List<VolumeMappingDto>? VolumeMappings { get; set; }
    public bool AutoDeploy { get; set; }
}

public class UpdateDeploymentRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Branch { get; set; }
    public string? Tag { get; set; }
    public Dictionary<string, string>? EnvironmentVariables { get; set; }
    public List<PortMappingDto>? PortMappings { get; set; }
    public List<VolumeMappingDto>? VolumeMappings { get; set; }
    public bool AutoDeploy { get; set; }
}

public class ExecuteDeploymentRequest
{
    public int DeploymentId { get; set; }
    public int? EnvironmentId { get; set; }
}

public class ExecuteDeploymentResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? DeploymentLog { get; set; }
}

public class PortMappingDto
{
    public int HostPort { get; set; }
    public int ContainerPort { get; set; }
    public string Protocol { get; set; } = "tcp";
}

public class VolumeMappingDto
{
    public string HostPath { get; set; } = string.Empty;
    public string ContainerPath { get; set; } = string.Empty;
    public string Mode { get; set; } = "rw"; // rw or ro
}

// Deployment Environment DTOs
public class DeploymentEnvironmentDto
{
    public int Id { get; set; }
    public int DeploymentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public Dictionary<string, string>? EnvironmentVariables { get; set; }
    public List<PortMappingDto>? PortMappings { get; set; }
    public string? Branch { get; set; }
    public string? Tag { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastDeployedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateDeploymentEnvironmentRequest
{
    public int DeploymentId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // Production, Staging, Development, UAT, Testing, Custom
    public Dictionary<string, string>? EnvironmentVariables { get; set; }
    public List<PortMappingDto>? PortMappings { get; set; }
    public string? Branch { get; set; }
    public string? Tag { get; set; }
}

public class UpdateDeploymentEnvironmentRequest
{
    public string Name { get; set; } = string.Empty;
    public Dictionary<string, string>? EnvironmentVariables { get; set; }
    public List<PortMappingDto>? PortMappings { get; set; }
    public string? Branch { get; set; }
    public string? Tag { get; set; }
    public bool IsActive { get; set; }
}

// Port Allocation DTOs
public class PortAllocationDto
{
    public int Id { get; set; }
    public int ServerId { get; set; }
    public int DeploymentId { get; set; }
    public int Port { get; set; }
    public string? ServiceName { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public DateTime AllocatedAt { get; set; }
}

public class AllocatePortRequest
{
    public int ServerId { get; set; }
    public int DeploymentId { get; set; }
    public int? PreferredPort { get; set; }
    public string? ServiceName { get; set; }
    public string? Description { get; set; }
}

public class AllocatePortResponse
{
    public int AllocatedPort { get; set; }
    public string Message { get; set; } = string.Empty;
}

// AI Suggestions DTOs
public class AiDeploymentSuggestions
{
    public string RecommendedType { get; set; } = string.Empty;
    public string? DockerComposeFile { get; set; }
    public string? Dockerfile { get; set; }
    public List<PortMappingDto> SuggestedPorts { get; set; } = new();
    public Dictionary<string, string> SuggestedEnvironmentVariables { get; set; } = new();
    public List<VolumeMappingDto> SuggestedVolumes { get; set; } = new();
    public string? BuildContext { get; set; }
    public double Confidence { get; set; }
    public string? Reasoning { get; set; }
}

public class GenerateDeploymentSuggestionsRequest
{
    public int RepositoryId { get; set; }
    public int ServerId { get; set; }
    public string? Branch { get; set; }
}
