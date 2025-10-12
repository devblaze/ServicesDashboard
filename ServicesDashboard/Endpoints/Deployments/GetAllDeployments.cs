using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Deployment;

namespace ServicesDashboard.Endpoints.Deployments;

public class GetAllDeploymentsRequest
{
    public int? ServerId { get; set; }
    public int? RepositoryId { get; set; }
}

public class GetAllDeploymentsEndpoint : Endpoint<GetAllDeploymentsRequest, List<DeploymentDto>>
{
    private readonly IDeploymentService _deploymentService;

    public GetAllDeploymentsEndpoint(IDeploymentService deploymentService)
    {
        _deploymentService = deploymentService;
    }

    public override void Configure()
    {
        Get("/api/deployments");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetAllDeploymentsRequest req, CancellationToken ct)
    {
        var deployments = await _deploymentService.GetAllAsync(req.ServerId, req.RepositoryId);
        await Send.OkAsync(deployments, cancellation: ct);
    }
}
