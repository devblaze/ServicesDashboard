using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Deployment;

namespace ServicesDashboard.Endpoints.Deployments;

public class ExecuteDeploymentEndpoint : Endpoint<ExecuteDeploymentRequest, ExecuteDeploymentResponse>
{
    private readonly IDeploymentService _deploymentService;

    public ExecuteDeploymentEndpoint(IDeploymentService deploymentService)
    {
        _deploymentService = deploymentService;
    }

    public override void Configure()
    {
        Post("/api/deployments/{deploymentId}/execute");
        AllowAnonymous();
    }

    public override async Task HandleAsync(ExecuteDeploymentRequest req, CancellationToken ct)
    {
        var result = await _deploymentService.ExecuteDeploymentAsync(req.DeploymentId, req.EnvironmentId);
        await Send.OkAsync(result, cancellation: ct);
    }
}

public class StopDeploymentRequest
{
    public int Id { get; set; }
}

public class StopDeploymentEndpoint : Endpoint<StopDeploymentRequest>
{
    private readonly IDeploymentService _deploymentService;

    public StopDeploymentEndpoint(IDeploymentService deploymentService)
    {
        _deploymentService = deploymentService;
    }

    public override void Configure()
    {
        Post("/api/deployments/{id}/stop");
        AllowAnonymous();
    }

    public override async Task HandleAsync(StopDeploymentRequest req, CancellationToken ct)
    {
        var success = await _deploymentService.StopDeploymentAsync(req.Id);

        if (!success)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.OkAsync(new { message = "Deployment stopped successfully" }, ct);
    }
}
