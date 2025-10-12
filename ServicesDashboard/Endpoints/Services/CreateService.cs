using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services;

namespace ServicesDashboard.Endpoints.Services;

public class CreateServiceEndpoint : Endpoint<HostedService, HostedService>
{
    private readonly IUserServices _userServices;

    public CreateServiceEndpoint(IUserServices userServices)
    {
        _userServices = userServices;
    }

    public override void Configure()
    {
        Post("/api/services");
        AllowAnonymous();
    }

    public override async Task HandleAsync(HostedService req, CancellationToken ct)
    {
        var createdService = await _userServices.AddServiceAsync(req);
        await Send.CreatedAtAsync<GetServiceEndpoint>(
            new { id = createdService.Id },
            createdService,
            cancellation: ct);
    }
}
