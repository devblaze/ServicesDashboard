using FastEndpoints;
using ServicesDashboard.Services.Deployment;

namespace ServicesDashboard.Endpoints.Deployments;

public class DeleteEnvironmentRequest
{
    public int DeploymentId { get; set; }
    public int Id { get; set; }
}

public class DeleteEnvironmentEndpoint : Endpoint<DeleteEnvironmentRequest>
{
    private readonly IDeploymentService _deploymentService;

    public DeleteEnvironmentEndpoint(IDeploymentService deploymentService)
    {
        _deploymentService = deploymentService;
    }

    public override void Configure()
    {
        Delete("/api/deployments/{deploymentId}/environments/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(DeleteEnvironmentRequest req, CancellationToken ct)
    {
        var success = await _deploymentService.DeleteEnvironmentAsync(req.Id, req.DeploymentId);

        if (!success)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.OkAsync(new { message = "Environment deleted successfully" }, ct);
    }
}
