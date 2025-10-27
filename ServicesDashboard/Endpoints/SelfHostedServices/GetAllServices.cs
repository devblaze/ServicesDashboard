using FastEndpoints;
using ServicesDashboard.Services.SelfHosted;

namespace ServicesDashboard.Endpoints.SelfHostedServices;

public class GetAllServicesRequest
{
    public string? Type { get; set; }
    public string? Status { get; set; }
    public int? ServerId { get; set; }
    public int? RepositoryId { get; set; }
    public string? SearchTerm { get; set; }
}

public class GetAllServices : Endpoint<GetAllServicesRequest, SelfHostedServicesResult>
{
    private readonly ISelfHostedServicesService _servicesService;

    public GetAllServices(ISelfHostedServicesService servicesService)
    {
        _servicesService = servicesService;
    }

    public override void Configure()
    {
        Get("/api/selfhostedservices");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetAllServicesRequest req, CancellationToken ct)
    {
        var filter = new SelfHostedServicesFilter
        {
            Type = req.Type,
            Status = req.Status,
            ServerId = req.ServerId,
            RepositoryId = req.RepositoryId,
            SearchTerm = req.SearchTerm
        };

        var result = await _servicesService.GetAllServicesAsync(filter);
        await Send.OkAsync(result, ct);
    }
}
