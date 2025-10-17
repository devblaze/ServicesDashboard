using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.IpManagement;

namespace ServicesDashboard.Endpoints.IpManagement;

// GET /api/ip-management/subnets
public class GetAllSubnetsEndpoint : EndpointWithoutRequest<IEnumerable<Subnet>>
{
    private readonly IIpManagementService _ipManagementService;

    public GetAllSubnetsEndpoint(IIpManagementService ipManagementService)
    {
        _ipManagementService = ipManagementService;
    }

    public override void Configure()
    {
        Get("/api/ip-management/subnets");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var subnets = await _ipManagementService.GetAllSubnetsAsync();
        await Send.OkAsync(subnets, cancellation: ct);
    }
}

// GET /api/ip-management/subnets/{id}
public class GetSubnetRequest
{
    public int Id { get; set; }
}

public class GetSubnetEndpoint : Endpoint<GetSubnetRequest, Subnet>
{
    private readonly IIpManagementService _ipManagementService;

    public GetSubnetEndpoint(IIpManagementService ipManagementService)
    {
        _ipManagementService = ipManagementService;
    }

    public override void Configure()
    {
        Get("/api/ip-management/subnets/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetSubnetRequest req, CancellationToken ct)
    {
        var subnet = await _ipManagementService.GetSubnetAsync(req.Id);
        if (subnet == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.OkAsync(subnet, cancellation: ct);
    }
}

// POST /api/ip-management/subnets
public class CreateSubnetEndpoint : Endpoint<Subnet, Subnet>
{
    private readonly IIpManagementService _ipManagementService;

    public CreateSubnetEndpoint(IIpManagementService ipManagementService)
    {
        _ipManagementService = ipManagementService;
    }

    public override void Configure()
    {
        Post("/api/ip-management/subnets");
        AllowAnonymous();
    }

    public override async Task HandleAsync(Subnet req, CancellationToken ct)
    {
        var subnet = await _ipManagementService.CreateSubnetAsync(req);
        await Send.OkAsync(subnet, cancellation: ct);
    }
}

// PUT /api/ip-management/subnets/{id}
public class UpdateSubnetRequest
{
    public int Id { get; set; }
    public Subnet Subnet { get; set; } = null!;
}

public class UpdateSubnetEndpoint : Endpoint<UpdateSubnetRequest, Subnet>
{
    private readonly IIpManagementService _ipManagementService;

    public UpdateSubnetEndpoint(IIpManagementService ipManagementService)
    {
        _ipManagementService = ipManagementService;
    }

    public override void Configure()
    {
        Put("/api/ip-management/subnets/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(UpdateSubnetRequest req, CancellationToken ct)
    {
        req.Subnet.Id = req.Id;
        var subnet = await _ipManagementService.UpdateSubnetAsync(req.Subnet);
        await Send.OkAsync(subnet, cancellation: ct);
    }
}

// DELETE /api/ip-management/subnets/{id}
public class DeleteSubnetRequest
{
    public int Id { get; set; }
}

public class DeleteSubnetEndpoint : Endpoint<DeleteSubnetRequest>
{
    private readonly IIpManagementService _ipManagementService;

    public DeleteSubnetEndpoint(IIpManagementService ipManagementService)
    {
        _ipManagementService = ipManagementService;
    }

    public override void Configure()
    {
        Delete("/api/ip-management/subnets/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(DeleteSubnetRequest req, CancellationToken ct)
    {
        await _ipManagementService.DeleteSubnetAsync(req.Id);
        await Send.NoContentAsync(ct);
    }
}

// GET /api/ip-management/subnets/{id}/summary
public class GetSubnetSummaryRequest
{
    public int Id { get; set; }
}

public class GetSubnetSummaryEndpoint : Endpoint<GetSubnetSummaryRequest, SubnetSummary>
{
    private readonly IIpManagementService _ipManagementService;

    public GetSubnetSummaryEndpoint(IIpManagementService ipManagementService)
    {
        _ipManagementService = ipManagementService;
    }

    public override void Configure()
    {
        Get("/api/ip-management/subnets/{id}/summary");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetSubnetSummaryRequest req, CancellationToken ct)
    {
        var summary = await _ipManagementService.GetSubnetSummaryAsync(req.Id);
        await Send.OkAsync(summary, cancellation: ct);
    }
}

// GET /api/ip-management/subnets/{id}/available-ips
public class GetAvailableIpsRequest
{
    public int Id { get; set; }
    public bool AvoidDhcpRange { get; set; } = true;
}

public class GetAvailableIpsEndpoint : Endpoint<GetAvailableIpsRequest, IEnumerable<string>>
{
    private readonly IIpManagementService _ipManagementService;

    public GetAvailableIpsEndpoint(IIpManagementService ipManagementService)
    {
        _ipManagementService = ipManagementService;
    }

    public override void Configure()
    {
        Get("/api/ip-management/subnets/{id}/available-ips");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetAvailableIpsRequest req, CancellationToken ct)
    {
        var ips = await _ipManagementService.GetAvailableIpsInSubnetAsync(req.Id, req.AvoidDhcpRange);
        await Send.OkAsync(ips, cancellation: ct);
    }
}

// GET /api/ip-management/subnets/{id}/next-available-ip
public class GetNextAvailableIpRequest
{
    public int Id { get; set; }
    public bool AvoidDhcpRange { get; set; } = true;
}

public class GetNextAvailableIpResponse
{
    public string? IpAddress { get; set; }
}

public class GetNextAvailableIpEndpoint : Endpoint<GetNextAvailableIpRequest, GetNextAvailableIpResponse>
{
    private readonly IIpManagementService _ipManagementService;

    public GetNextAvailableIpEndpoint(IIpManagementService ipManagementService)
    {
        _ipManagementService = ipManagementService;
    }

    public override void Configure()
    {
        Get("/api/ip-management/subnets/{id}/next-available-ip");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetNextAvailableIpRequest req, CancellationToken ct)
    {
        var ip = await _ipManagementService.FindNextAvailableIpAsync(req.Id, req.AvoidDhcpRange);
        await Send.OkAsync(new GetNextAvailableIpResponse { IpAddress = ip }, cancellation: ct);
    }
}
