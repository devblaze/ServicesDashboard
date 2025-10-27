using FastEndpoints;
using ServicesDashboard.Services.SelfHosted;
using ServicesDashboard.Models.SelfHosted;

namespace ServicesDashboard.Endpoints.PortManagement;

public class DetectConflictsRequest
{
    public int ServerId { get; set; }
    public List<int> Ports { get; set; } = new();
}

public class DetectConflicts : Endpoint<DetectConflictsRequest, PortConflictResult>
{
    private readonly IPortManagementService _portManagementService;

    public DetectConflicts(IPortManagementService portManagementService)
    {
        _portManagementService = portManagementService;
    }

    public override void Configure()
    {
        Post("/api/portmanagement/detect-conflicts");
        AllowAnonymous();
    }

    public override async Task HandleAsync(DetectConflictsRequest req, CancellationToken ct)
    {
        var result = await _portManagementService.DetectConflictsAsync(req.ServerId, req.Ports);
        await Send.OkAsync(result, ct);
    }
}
