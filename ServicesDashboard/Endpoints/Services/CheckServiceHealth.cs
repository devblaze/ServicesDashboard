using FastEndpoints;
using ServicesDashboard.Services;

namespace ServicesDashboard.Endpoints.Services;

public class CheckServiceHealthRequest
{
    public Guid Id { get; set; }
}

public class CheckServiceHealthEndpoint : Endpoint<CheckServiceHealthRequest>
{
    private readonly IUserServices _userServices;

    public CheckServiceHealthEndpoint(IUserServices userServices)
    {
        _userServices = userServices;
    }

    public override void Configure()
    {
        Post("/api/services/{id}/check-health");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CheckServiceHealthRequest req, CancellationToken ct)
    {
        var success = await _userServices.CheckServiceHealthAsync(req.Id);
        if (!success)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.NoContentAsync(ct);
    }
}
