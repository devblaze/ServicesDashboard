using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.VirtualMachines;

namespace ServicesDashboard.Endpoints.VirtualMachines;

public class GetVMOperationRequest
{
    public Guid OperationId { get; set; }
}

public class GetVMOperationEndpoint : Endpoint<GetVMOperationRequest, VMOperation>
{
    private readonly IVMManagementService _vmService;

    public GetVMOperationEndpoint(IVMManagementService vmService)
    {
        _vmService = vmService;
    }

    public override void Configure()
    {
        Get("/api/virtualmachines/operations/{operationId}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetVMOperationRequest req, CancellationToken ct)
    {
        var operation = await _vmService.GetOperationAsync(req.OperationId);

        if (operation == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.OkAsync(operation, ct);
    }
}
