using FastEndpoints;
using ServicesDashboard.Services.VirtualMachines;

namespace ServicesDashboard.Endpoints.VirtualMachines;

public class GetVMPresetsEndpoint : EndpointWithoutRequest<IEnumerable<VMPresetInfo>>
{
    private readonly IVMManagementService _vmService;

    public GetVMPresetsEndpoint(IVMManagementService vmService)
    {
        _vmService = vmService;
    }

    public override void Configure()
    {
        Get("/api/virtualmachines/presets");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var presets = await _vmService.GetPresetsAsync();
        await Send.OkAsync(presets, ct);
    }
}
