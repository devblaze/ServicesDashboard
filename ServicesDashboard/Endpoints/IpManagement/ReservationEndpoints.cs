using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.IpManagement;

namespace ServicesDashboard.Endpoints.IpManagement;

// GET /api/ip-management/reservations
public class GetAllReservationsRequest
{
    public int? SubnetId { get; set; }
}

public class GetAllReservationsEndpoint : Endpoint<GetAllReservationsRequest, IEnumerable<IpReservation>>
{
    private readonly IIpManagementService _ipManagementService;

    public GetAllReservationsEndpoint(IIpManagementService ipManagementService)
    {
        _ipManagementService = ipManagementService;
    }

    public override void Configure()
    {
        Get("/api/ip-management/reservations");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetAllReservationsRequest req, CancellationToken ct)
    {
        var reservations = await _ipManagementService.GetAllReservationsAsync(req.SubnetId);
        await Send.OkAsync(reservations, cancellation: ct);
    }
}

// GET /api/ip-management/reservations/{id}
public class GetReservationRequest
{
    public int Id { get; set; }
}

public class GetReservationEndpoint : Endpoint<GetReservationRequest, IpReservation>
{
    private readonly IIpManagementService _ipManagementService;

    public GetReservationEndpoint(IIpManagementService ipManagementService)
    {
        _ipManagementService = ipManagementService;
    }

    public override void Configure()
    {
        Get("/api/ip-management/reservations/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetReservationRequest req, CancellationToken ct)
    {
        var reservation = await _ipManagementService.GetReservationAsync(req.Id);
        if (reservation == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.OkAsync(reservation, cancellation: ct);
    }
}

// POST /api/ip-management/reservations
public class CreateReservationEndpoint : Endpoint<IpReservation, IpReservation>
{
    private readonly IIpManagementService _ipManagementService;

    public CreateReservationEndpoint(IIpManagementService ipManagementService)
    {
        _ipManagementService = ipManagementService;
    }

    public override void Configure()
    {
        Post("/api/ip-management/reservations");
        AllowAnonymous();
    }

    public override async Task HandleAsync(IpReservation req, CancellationToken ct)
    {
        var reservation = await _ipManagementService.CreateReservationAsync(req);
        await Send.OkAsync(reservation, cancellation: ct);
    }
}

// PUT /api/ip-management/reservations/{id}
public class UpdateReservationRequest
{
    public int Id { get; set; }
    public IpReservation Reservation { get; set; } = null!;
}

public class UpdateReservationEndpoint : Endpoint<UpdateReservationRequest, IpReservation>
{
    private readonly IIpManagementService _ipManagementService;

    public UpdateReservationEndpoint(IIpManagementService ipManagementService)
    {
        _ipManagementService = ipManagementService;
    }

    public override void Configure()
    {
        Put("/api/ip-management/reservations/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(UpdateReservationRequest req, CancellationToken ct)
    {
        req.Reservation.Id = req.Id;
        var reservation = await _ipManagementService.UpdateReservationAsync(req.Reservation);
        await Send.OkAsync(reservation, cancellation: ct);
    }
}

// DELETE /api/ip-management/reservations/{id}
public class DeleteReservationRequest
{
    public int Id { get; set; }
}

public class DeleteReservationEndpoint : Endpoint<DeleteReservationRequest>
{
    private readonly IIpManagementService _ipManagementService;

    public DeleteReservationEndpoint(IIpManagementService ipManagementService)
    {
        _ipManagementService = ipManagementService;
    }

    public override void Configure()
    {
        Delete("/api/ip-management/reservations/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(DeleteReservationRequest req, CancellationToken ct)
    {
        await _ipManagementService.DeleteReservationAsync(req.Id);
        await Send.NoContentAsync(ct);
    }
}
