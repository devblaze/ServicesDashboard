using FastEndpoints;
using ServicesDashboard.Services.SelfHosted;
using ServicesDashboard.Data.Entities;

namespace ServicesDashboard.Endpoints.PortManagement;

public class GetAllocatedPortsRequest
{
    public int ServerId { get; set; }
}

public class GetAllocatedPorts : Endpoint<GetAllocatedPortsRequest, List<PortAllocation>>
{
    private readonly IPortManagementService _portManagementService;

    public GetAllocatedPorts(IPortManagementService portManagementService)
    {
        _portManagementService = portManagementService;
    }

    public override void Configure()
    {
        Get("/api/portmanagement/allocated-ports/{ServerId}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetAllocatedPortsRequest req, CancellationToken ct)
    {
        var allocatedPorts = await _portManagementService.GetAllocatedPortsAsync(req.ServerId);
        await Send.OkAsync(allocatedPorts, ct);
    }
}
