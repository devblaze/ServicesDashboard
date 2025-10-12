using FastEndpoints;
using ServicesDashboard.Services.NetworkDiscovery;

namespace ServicesDashboard.Endpoints.NetworkDiscovery;

public class GetExtendedPortsEndpoint : EndpointWithoutRequest<int[]>
{
    private readonly INetworkDiscoveryService _networkDiscoveryService;

    public GetExtendedPortsEndpoint(INetworkDiscoveryService networkDiscoveryService)
    {
        _networkDiscoveryService = networkDiscoveryService;
    }

    public override void Configure()
    {
        Get("/api/networkdiscovery/extended-ports");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var ports = _networkDiscoveryService.GetExtendedPorts();
        await Send.OkAsync(ports, ct);
    }
}
