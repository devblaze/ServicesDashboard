using FastEndpoints;
using ServicesDashboard.Services.Deployment;

namespace ServicesDashboard.Endpoints.Deployments;

public class DeleteDeploymentRequest
{
    public int Id { get; set; }
}

public class DeleteDeploymentEndpoint : Endpoint<DeleteDeploymentRequest>
{
    private readonly IDeploymentService _deploymentService;

    public DeleteDeploymentEndpoint(IDeploymentService deploymentService)
    {
        _deploymentService = deploymentService;
    }

    public override void Configure()
    {
        Delete("/api/deployments/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(DeleteDeploymentRequest req, CancellationToken ct)
    {
        var success = await _deploymentService.DeleteAsync(req.Id);

        if (!success)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.OkAsync(new { message = "Deployment deleted successfully" }, ct);
    }
}
