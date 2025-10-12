using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Deployment;

namespace ServicesDashboard.Endpoints.Deployments;

public class UpdateDeploymentRequestWithId
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public string? Branch { get; set; }
    public string? Tag { get; set; }
    public Dictionary<string, string>? EnvironmentVariables { get; set; }
    public List<PortMappingDto>? PortMappings { get; set; }
    public List<VolumeMappingDto>? VolumeMappings { get; set; }
    public bool AutoDeploy { get; set; }
}

public class UpdateDeploymentEndpoint : Endpoint<UpdateDeploymentRequestWithId, DeploymentDto>
{
    private readonly IDeploymentService _deploymentService;

    public UpdateDeploymentEndpoint(IDeploymentService deploymentService)
    {
        _deploymentService = deploymentService;
    }

    public override void Configure()
    {
        Put("/api/deployments/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(UpdateDeploymentRequestWithId req, CancellationToken ct)
    {
        var updateRequest = new UpdateDeploymentRequest
        {
            Name = req.Name ?? string.Empty,
            Branch = req.Branch,
            Tag = req.Tag,
            EnvironmentVariables = req.EnvironmentVariables,
            PortMappings = req.PortMappings,
            VolumeMappings = req.VolumeMappings,
            AutoDeploy = req.AutoDeploy
        };

        var deployment = await _deploymentService.UpdateAsync(req.Id, updateRequest);

        if (deployment == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.OkAsync(deployment, cancellation: ct);
    }
}
