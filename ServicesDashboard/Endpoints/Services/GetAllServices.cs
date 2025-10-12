using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services;

namespace ServicesDashboard.Endpoints.Services;

public class GetAllServicesEndpoint : EndpointWithoutRequest<IEnumerable<HostedService>>
{
    private readonly IUserServices _userServices;

    public GetAllServicesEndpoint(IUserServices userServices)
    {
        _userServices = userServices;
    }

    public override void Configure()
    {
        Get("/api/services");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var services = await _userServices.GetAllServicesAsync();
        await Send.OkAsync(services, ct);
    }
}
