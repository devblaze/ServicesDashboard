using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Deployment;

namespace ServicesDashboard.Endpoints.Deployments;

public class UpdateEnvironmentRequestWithId
{
    public int DeploymentId { get; set; }
    public int Id { get; set; }
    public string? Name { get; set; }
    public string? Branch { get; set; }
    public string? Tag { get; set; }
    public Dictionary<string, string>? EnvironmentVariables { get; set; }
    public List<PortMappingDto>? PortMappings { get; set; }
    public bool IsActive { get; set; }
}

public class UpdateEnvironmentEndpoint : Endpoint<UpdateEnvironmentRequestWithId, DeploymentEnvironmentDto>
{
    private readonly IDeploymentService _deploymentService;

    public UpdateEnvironmentEndpoint(IDeploymentService deploymentService)
    {
        _deploymentService = deploymentService;
    }

    public override void Configure()
    {
        Put("/api/deployments/{deploymentId}/environments/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(UpdateEnvironmentRequestWithId req, CancellationToken ct)
    {
        var updateRequest = new UpdateDeploymentEnvironmentRequest
        {
            Name = req.Name ?? string.Empty,
            Branch = req.Branch,
            Tag = req.Tag,
            EnvironmentVariables = req.EnvironmentVariables,
            PortMappings = req.PortMappings,
            IsActive = req.IsActive
        };

        var environment = await _deploymentService.UpdateEnvironmentAsync(req.Id, updateRequest);

        if (environment == null || environment.DeploymentId != req.DeploymentId)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.OkAsync(environment, cancellation: ct);
    }
}
