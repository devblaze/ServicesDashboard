using FastEndpoints;
using ServicesDashboard.Services.SelfHosted;

namespace ServicesDashboard.Endpoints.PortManagement;

public class SuggestPortsRequest
{
    public int ServerId { get; set; }
    public int Count { get; set; } = 1;
    public int? RangeStart { get; set; }
    public int? RangeEnd { get; set; }
}

public class SuggestPortsResponse
{
    public List<int> SuggestedPorts { get; set; } = new();
}

public class SuggestPorts : Endpoint<SuggestPortsRequest, SuggestPortsResponse>
{
    private readonly IPortManagementService _portManagementService;

    public SuggestPorts(IPortManagementService portManagementService)
    {
        _portManagementService = portManagementService;
    }

    public override void Configure()
    {
        Post("/api/portmanagement/suggest-ports");
        AllowAnonymous();
    }

    public override async Task HandleAsync(SuggestPortsRequest req, CancellationToken ct)
    {
        var suggestedPorts = await _portManagementService.SuggestAvailablePortsAsync(
            req.ServerId,
            req.Count,
            req.RangeStart,
            req.RangeEnd
        );

        await Send.OkAsync(new SuggestPortsResponse { SuggestedPorts = suggestedPorts }, ct);
    }
}
