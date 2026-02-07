using FastEndpoints;
using ServicesDashboard.Services.VirtualMachines;

namespace ServicesDashboard.Endpoints.VirtualMachines;

public class GetUnraidServersEndpoint : EndpointWithoutRequest<IEnumerable<UnraidServerInfo>>
{
    private readonly IVMManagementService _vmService;

    public GetUnraidServersEndpoint(IVMManagementService vmService)
    {
        _vmService = vmService;
    }

    public override void Configure()
    {
        Get("/api/virtualmachines/unraid-servers");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var servers = await _vmService.GetUnraidServersAsync();
        await Send.OkAsync(servers, ct);
    }
}
