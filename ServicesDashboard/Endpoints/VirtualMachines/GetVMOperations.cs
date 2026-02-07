using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.VirtualMachines;

namespace ServicesDashboard.Endpoints.VirtualMachines;

public class GetVMOperationsRequest
{
    [QueryParam]
    public int? HostServerId { get; set; }
}

public class GetVMOperationsEndpoint : Endpoint<GetVMOperationsRequest, IEnumerable<VMOperation>>
{
    private readonly IVMManagementService _vmService;

    public GetVMOperationsEndpoint(IVMManagementService vmService)
    {
        _vmService = vmService;
    }

    public override void Configure()
    {
        Get("/api/virtualmachines/operations");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetVMOperationsRequest req, CancellationToken ct)
    {
        var operations = await _vmService.GetOperationsAsync(req.HostServerId);
        await Send.OkAsync(operations, ct);
    }
}
