using FastEndpoints;
using ServicesDashboard.Services.NetworkDiscovery;

namespace ServicesDashboard.Endpoints.NetworkDiscovery;

public class GetCommonPortsEndpoint : EndpointWithoutRequest<int[]>
{
    private readonly INetworkDiscoveryService _networkDiscoveryService;

    public GetCommonPortsEndpoint(INetworkDiscoveryService networkDiscoveryService)
    {
        _networkDiscoveryService = networkDiscoveryService;
    }

    public override void Configure()
    {
        Get("/api/networkdiscovery/common-ports");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var ports = _networkDiscoveryService.GetCommonPorts();
        await Send.OkAsync(ports, ct);
    }
}
