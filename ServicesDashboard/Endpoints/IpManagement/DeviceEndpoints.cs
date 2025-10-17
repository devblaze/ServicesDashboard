using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.IpManagement;

namespace ServicesDashboard.Endpoints.IpManagement;

// GET /api/ip-management/devices
public class GetAllDevicesRequest
{
    public int? SubnetId { get; set; }
}

public class GetAllDevicesEndpoint : Endpoint<GetAllDevicesRequest, IEnumerable<NetworkDevice>>
{
    private readonly IIpManagementService _ipManagementService;

    public GetAllDevicesEndpoint(IIpManagementService ipManagementService)
    {
        _ipManagementService = ipManagementService;
    }

    public override void Configure()
    {
        Get("/api/ip-management/devices");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetAllDevicesRequest req, CancellationToken ct)
    {
        var devices = await _ipManagementService.GetAllDevicesAsync(req.SubnetId);
        await Send.OkAsync(devices, cancellation: ct);
    }
}

// GET /api/ip-management/devices/{id}
public class GetDeviceRequest
{
    public int Id { get; set; }
}

public class GetDeviceEndpoint : Endpoint<GetDeviceRequest, NetworkDevice>
{
    private readonly IIpManagementService _ipManagementService;

    public GetDeviceEndpoint(IIpManagementService ipManagementService)
    {
        _ipManagementService = ipManagementService;
    }

    public override void Configure()
    {
        Get("/api/ip-management/devices/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetDeviceRequest req, CancellationToken ct)
    {
        var device = await _ipManagementService.GetDeviceAsync(req.Id);
        if (device == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.OkAsync(device, cancellation: ct);
    }
}

// GET /api/ip-management/devices/by-ip/{ipAddress}
public class GetDeviceByIpRequest
{
    public string IpAddress { get; set; } = string.Empty;
}

public class GetDeviceByIpEndpoint : Endpoint<GetDeviceByIpRequest, NetworkDevice>
{
    private readonly IIpManagementService _ipManagementService;

    public GetDeviceByIpEndpoint(IIpManagementService ipManagementService)
    {
        _ipManagementService = ipManagementService;
    }

    public override void Configure()
    {
        Get("/api/ip-management/devices/by-ip/{ipAddress}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetDeviceByIpRequest req, CancellationToken ct)
    {
        var device = await _ipManagementService.GetDeviceByIpAsync(req.IpAddress);
        if (device == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.OkAsync(device, cancellation: ct);
    }
}

// POST /api/ip-management/devices
public class CreateDeviceEndpoint : Endpoint<NetworkDevice, NetworkDevice>
{
    private readonly IIpManagementService _ipManagementService;

    public CreateDeviceEndpoint(IIpManagementService ipManagementService)
    {
        _ipManagementService = ipManagementService;
    }

    public override void Configure()
    {
        Post("/api/ip-management/devices");
        AllowAnonymous();
    }

    public override async Task HandleAsync(NetworkDevice req, CancellationToken ct)
    {
        var device = await _ipManagementService.CreateOrUpdateDeviceAsync(req);
        await Send.OkAsync(device, cancellation: ct);
    }
}

// PUT /api/ip-management/devices/{id}
public class UpdateDeviceRequest
{
    public int Id { get; set; }
    public NetworkDevice Device { get; set; } = null!;
}

public class UpdateDeviceEndpoint : Endpoint<UpdateDeviceRequest, NetworkDevice>
{
    private readonly IIpManagementService _ipManagementService;

    public UpdateDeviceEndpoint(IIpManagementService ipManagementService)
    {
        _ipManagementService = ipManagementService;
    }

    public override void Configure()
    {
        Put("/api/ip-management/devices/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(UpdateDeviceRequest req, CancellationToken ct)
    {
        req.Device.Id = req.Id;
        var device = await _ipManagementService.CreateOrUpdateDeviceAsync(req.Device);
        await Send.OkAsync(device, cancellation: ct);
    }
}

// DELETE /api/ip-management/devices/{id}
public class DeleteDeviceRequest
{
    public int Id { get; set; }
}

public class DeleteDeviceEndpoint : Endpoint<DeleteDeviceRequest>
{
    private readonly IIpManagementService _ipManagementService;

    public DeleteDeviceEndpoint(IIpManagementService ipManagementService)
    {
        _ipManagementService = ipManagementService;
    }

    public override void Configure()
    {
        Delete("/api/ip-management/devices/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(DeleteDeviceRequest req, CancellationToken ct)
    {
        await _ipManagementService.DeleteDeviceAsync(req.Id);
        await Send.NoContentAsync(ct);
    }
}

// GET /api/ip-management/devices/{id}/history
public class GetDeviceHistoryRequest
{
    public int Id { get; set; }
    public int Limit { get; set; } = 50;
}

public class GetDeviceHistoryEndpoint : Endpoint<GetDeviceHistoryRequest, IEnumerable<DeviceHistory>>
{
    private readonly IIpManagementService _ipManagementService;

    public GetDeviceHistoryEndpoint(IIpManagementService ipManagementService)
    {
        _ipManagementService = ipManagementService;
    }

    public override void Configure()
    {
        Get("/api/ip-management/devices/{id}/history");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetDeviceHistoryRequest req, CancellationToken ct)
    {
        var history = await _ipManagementService.GetDeviceHistoryAsync(req.Id, req.Limit);
        await Send.OkAsync(history, cancellation: ct);
    }
}

// GET /api/ip-management/devices/conflicts
public class GetDeviceConflictsRequest
{
    public int? SubnetId { get; set; }
}

public class GetDeviceConflictsEndpoint : Endpoint<GetDeviceConflictsRequest, IEnumerable<NetworkDevice>>
{
    private readonly IIpManagementService _ipManagementService;

    public GetDeviceConflictsEndpoint(IIpManagementService ipManagementService)
    {
        _ipManagementService = ipManagementService;
    }

    public override void Configure()
    {
        Get("/api/ip-management/devices/conflicts");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetDeviceConflictsRequest req, CancellationToken ct)
    {
        var conflicts = await _ipManagementService.DetectIpConflictsAsync(req.SubnetId);
        await Send.OkAsync(conflicts, cancellation: ct);
    }
}

// POST /api/ip-management/devices/check-availability
public class CheckIpAvailabilityRequest
{
    public string IpAddress { get; set; } = string.Empty;
    public int? SubnetId { get; set; }
}

public class CheckIpAvailabilityResponse
{
    public bool IsAvailable { get; set; }
    public string IpAddress { get; set; } = string.Empty;
}

public class CheckIpAvailabilityEndpoint : Endpoint<CheckIpAvailabilityRequest, CheckIpAvailabilityResponse>
{
    private readonly IIpManagementService _ipManagementService;

    public CheckIpAvailabilityEndpoint(IIpManagementService ipManagementService)
    {
        _ipManagementService = ipManagementService;
    }

    public override void Configure()
    {
        Post("/api/ip-management/devices/check-availability");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CheckIpAvailabilityRequest req, CancellationToken ct)
    {
        var isAvailable = await _ipManagementService.IsIpAvailableAsync(req.IpAddress, req.SubnetId);
        await Send.OkAsync(new CheckIpAvailabilityResponse
        {
            IsAvailable = isAvailable,
            IpAddress = req.IpAddress
        }, cancellation: ct);
    }
}
