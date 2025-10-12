using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Deployment;

namespace ServicesDashboard.Endpoints.Deployments;

public class CreateDeploymentEndpoint : Endpoint<CreateDeploymentRequest, DeploymentDto>
{
    private readonly IDeploymentService _deploymentService;

    public CreateDeploymentEndpoint(IDeploymentService deploymentService)
    {
        _deploymentService = deploymentService;
    }

    public override void Configure()
    {
        Post("/api/deployments");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CreateDeploymentRequest req, CancellationToken ct)
    {
        var deployment = await _deploymentService.CreateAsync(req);
        await Send.CreatedAtAsync<GetDeploymentEndpoint>(new { id = deployment.Id }, deployment, cancellation: ct);
    }
}

public class GetDeploymentRequest
{
    public int Id { get; set; }
}

public class GetDeploymentEndpoint : Endpoint<GetDeploymentRequest, DeploymentDto>
{
    private readonly IDeploymentService _deploymentService;

    public GetDeploymentEndpoint(IDeploymentService deploymentService)
    {
        _deploymentService = deploymentService;
    }

    public override void Configure()
    {
        Get("/api/deployments/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetDeploymentRequest req, CancellationToken ct)
    {
        var deployment = await _deploymentService.GetByIdAsync(req.Id);

        if (deployment == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.OkAsync(deployment, cancellation: ct);
    }
}
