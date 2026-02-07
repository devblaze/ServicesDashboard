using FastEndpoints;
using ServicesDashboard.Services.VirtualMachines;

namespace ServicesDashboard.Endpoints.VirtualMachines;

public class CancelVMOperationRequest
{
    public Guid OperationId { get; set; }
}

public class CancelVMOperationEndpoint : Endpoint<CancelVMOperationRequest>
{
    private readonly IVMManagementService _vmService;
    private readonly ILogger<CancelVMOperationEndpoint> _logger;

    public CancelVMOperationEndpoint(IVMManagementService vmService, ILogger<CancelVMOperationEndpoint> logger)
    {
        _vmService = vmService;
        _logger = logger;
    }

    public override void Configure()
    {
        Delete("/api/virtualmachines/operations/{operationId}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancelVMOperationRequest req, CancellationToken ct)
    {
        var cancelled = await _vmService.CancelOperationAsync(req.OperationId);

        if (!cancelled)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        _logger.LogInformation("Cancelled VM operation {OperationId}", req.OperationId);
        await Send.NoContentAsync(ct);
    }
}
