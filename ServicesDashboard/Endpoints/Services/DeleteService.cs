using FastEndpoints;
using ServicesDashboard.Services;

namespace ServicesDashboard.Endpoints.Services;

public class DeleteServiceRequest
{
    public Guid Id { get; set; }
}

public class DeleteServiceEndpoint : Endpoint<DeleteServiceRequest>
{
    private readonly IUserServices _userServices;

    public DeleteServiceEndpoint(IUserServices userServices)
    {
        _userServices = userServices;
    }

    public override void Configure()
    {
        Delete("/api/services/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(DeleteServiceRequest req, CancellationToken ct)
    {
        var success = await _userServices.DeleteServiceAsync(req.Id);
        if (!success)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.NoContentAsync(ct);
    }
}
