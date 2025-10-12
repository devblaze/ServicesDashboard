using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Deployment;

namespace ServicesDashboard.Endpoints.Deployments;

public class CreateEnvironmentEndpoint : Endpoint<CreateDeploymentEnvironmentRequest, DeploymentEnvironmentDto>
{
    private readonly IDeploymentService _deploymentService;

    public CreateEnvironmentEndpoint(IDeploymentService deploymentService)
    {
        _deploymentService = deploymentService;
    }

    public override void Configure()
    {
        Post("/api/deployments/{deploymentId}/environments");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CreateDeploymentEnvironmentRequest req, CancellationToken ct)
    {
        var environment = await _deploymentService.CreateEnvironmentAsync(req);
        await Send.CreatedAtAsync<GetEnvironmentEndpoint>(
            new { deploymentId = req.DeploymentId, id = environment.Id },
            environment,
            cancellation: ct
        );
    }
}

public class GetEnvironmentRequest
{
    public int DeploymentId { get; set; }
    public int Id { get; set; }
}

public class GetEnvironmentEndpoint : Endpoint<GetEnvironmentRequest, DeploymentEnvironmentDto>
{
    private readonly IDeploymentService _deploymentService;

    public GetEnvironmentEndpoint(IDeploymentService deploymentService)
    {
        _deploymentService = deploymentService;
    }

    public override void Configure()
    {
        Get("/api/deployments/{deploymentId}/environments/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetEnvironmentRequest req, CancellationToken ct)
    {
        var environment = await _deploymentService.GetEnvironmentByIdAsync(req.Id);

        if (environment == null || environment.DeploymentId != req.DeploymentId)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.OkAsync(environment, cancellation: ct);
    }
}

public class GetAllEnvironmentsRequest
{
    public int DeploymentId { get; set; }
}

public class GetAllEnvironmentsEndpoint : Endpoint<GetAllEnvironmentsRequest, List<DeploymentEnvironmentDto>>
{
    private readonly IDeploymentService _deploymentService;

    public GetAllEnvironmentsEndpoint(IDeploymentService deploymentService)
    {
        _deploymentService = deploymentService;
    }

    public override void Configure()
    {
        Get("/api/deployments/{deploymentId}/environments");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetAllEnvironmentsRequest req, CancellationToken ct)
    {
        var environments = await _deploymentService.GetAllEnvironmentsAsync(req.DeploymentId);
        await Send.OkAsync(environments, cancellation: ct);
    }
}
