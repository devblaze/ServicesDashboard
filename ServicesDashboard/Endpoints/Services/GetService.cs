using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services;

namespace ServicesDashboard.Endpoints.Services;

public class GetServiceRequest
{
    public Guid Id { get; set; }
}

public class GetServiceEndpoint : Endpoint<GetServiceRequest, HostedService>
{
    private readonly IUserServices _userServices;

    public GetServiceEndpoint(IUserServices userServices)
    {
        _userServices = userServices;
    }

    public override void Configure()
    {
        Get("/api/services/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetServiceRequest req, CancellationToken ct)
    {
        var service = await _userServices.GetServiceByIdAsync(req.Id);
        if (service == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.OkAsync(service, ct);
    }
}
