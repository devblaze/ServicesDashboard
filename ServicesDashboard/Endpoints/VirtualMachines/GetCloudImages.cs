using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.VirtualMachines;

namespace ServicesDashboard.Endpoints.VirtualMachines;

public class GetCloudImagesEndpoint : EndpointWithoutRequest<IEnumerable<CloudImage>>
{
    private readonly IVMManagementService _vmService;

    public GetCloudImagesEndpoint(IVMManagementService vmService)
    {
        _vmService = vmService;
    }

    public override void Configure()
    {
        Get("/api/virtualmachines/images");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var images = await _vmService.GetAvailableImagesAsync();
        await Send.OkAsync(images, ct);
    }
}
