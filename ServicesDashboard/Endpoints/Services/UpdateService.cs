using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services;

namespace ServicesDashboard.Endpoints.Services;

public class UpdateServiceRequest
{
    public Guid Id { get; set; }
    public HostedService Service { get; set; } = null!;
}

public class UpdateServiceEndpoint : Endpoint<UpdateServiceRequest>
{
    private readonly IUserServices _userServices;

    public UpdateServiceEndpoint(IUserServices userServices)
    {
        _userServices = userServices;
    }

    public override void Configure()
    {
        Put("/api/services/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(UpdateServiceRequest req, CancellationToken ct)
    {
        if (req.Id != req.Service.Id)
        {
            HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsync(@"{""error"":""ID mismatch""}", ct);
                return;
        }

        var success = await _userServices.UpdateServiceAsync(req.Service);
        if (!success)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.NoContentAsync(ct);
    }
}
