using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.IpManagement;

namespace ServicesDashboard.Endpoints.IpManagement;

// GET /api/ip-management/omada-controllers
public class GetAllOmadaControllersEndpoint : EndpointWithoutRequest<IEnumerable<OmadaController>>
{
    private readonly IOmadaControllerService _omadaControllerService;

    public GetAllOmadaControllersEndpoint(IOmadaControllerService omadaControllerService)
    {
        _omadaControllerService = omadaControllerService;
    }

    public override void Configure()
    {
        Get("/api/ip-management/omada-controllers");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var controllers = await _omadaControllerService.GetAllControllersAsync();
        await Send.OkAsync(controllers, cancellation: ct);
    }
}

// GET /api/ip-management/omada-controllers/{id}
public class GetOmadaControllerRequest
{
    public int Id { get; set; }
}

public class GetOmadaControllerEndpoint : Endpoint<GetOmadaControllerRequest, OmadaController>
{
    private readonly IOmadaControllerService _omadaControllerService;

    public GetOmadaControllerEndpoint(IOmadaControllerService omadaControllerService)
    {
        _omadaControllerService = omadaControllerService;
    }

    public override void Configure()
    {
        Get("/api/ip-management/omada-controllers/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetOmadaControllerRequest req, CancellationToken ct)
    {
        var controller = await _omadaControllerService.GetControllerAsync(req.Id);
        if (controller == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.OkAsync(controller, cancellation: ct);
    }
}

// POST /api/ip-management/omada-controllers
public class CreateOmadaControllerEndpoint : Endpoint<OmadaController, OmadaController>
{
    private readonly IOmadaControllerService _omadaControllerService;

    public CreateOmadaControllerEndpoint(IOmadaControllerService omadaControllerService)
    {
        _omadaControllerService = omadaControllerService;
    }

    public override void Configure()
    {
        Post("/api/ip-management/omada-controllers");
        AllowAnonymous();
    }

    public override async Task HandleAsync(OmadaController req, CancellationToken ct)
    {
        var controller = await _omadaControllerService.CreateControllerAsync(req);
        await Send.OkAsync(controller, cancellation: ct);
    }
}

// PUT /api/ip-management/omada-controllers/{id}
public class UpdateOmadaControllerRequest
{
    public int Id { get; set; }
    public OmadaController Controller { get; set; } = null!;
}

public class UpdateOmadaControllerEndpoint : Endpoint<UpdateOmadaControllerRequest, OmadaController>
{
    private readonly IOmadaControllerService _omadaControllerService;

    public UpdateOmadaControllerEndpoint(IOmadaControllerService omadaControllerService)
    {
        _omadaControllerService = omadaControllerService;
    }

    public override void Configure()
    {
        Put("/api/ip-management/omada-controllers/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(UpdateOmadaControllerRequest req, CancellationToken ct)
    {
        req.Controller.Id = req.Id;
        var controller = await _omadaControllerService.UpdateControllerAsync(req.Controller);
        await Send.OkAsync(controller, cancellation: ct);
    }
}

// DELETE /api/ip-management/omada-controllers/{id}
public class DeleteOmadaControllerRequest
{
    public int Id { get; set; }
}

public class DeleteOmadaControllerEndpoint : Endpoint<DeleteOmadaControllerRequest>
{
    private readonly IOmadaControllerService _omadaControllerService;

    public DeleteOmadaControllerEndpoint(IOmadaControllerService omadaControllerService)
    {
        _omadaControllerService = omadaControllerService;
    }

    public override void Configure()
    {
        Delete("/api/ip-management/omada-controllers/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(DeleteOmadaControllerRequest req, CancellationToken ct)
    {
        await _omadaControllerService.DeleteControllerAsync(req.Id);
        await Send.NoContentAsync(ct);
    }
}

// POST /api/ip-management/omada-controllers/{id}/test-connection
public class TestOmadaConnectionRequest
{
    public int Id { get; set; }
}

public class TestOmadaConnectionResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class TestOmadaConnectionEndpoint : Endpoint<TestOmadaConnectionRequest, TestOmadaConnectionResponse>
{
    private readonly IOmadaControllerService _omadaControllerService;

    public TestOmadaConnectionEndpoint(IOmadaControllerService omadaControllerService)
    {
        _omadaControllerService = omadaControllerService;
    }

    public override void Configure()
    {
        Post("/api/ip-management/omada-controllers/{id}/test-connection");
        AllowAnonymous();
    }

    public override async Task HandleAsync(TestOmadaConnectionRequest req, CancellationToken ct)
    {
        var success = await _omadaControllerService.TestConnectionAsync(req.Id);
        await Send.OkAsync(new TestOmadaConnectionResponse
        {
            Success = success,
            Message = success ? "Connection successful" : "Connection failed"
        }, cancellation: ct);
    }
}

// POST /api/ip-management/omada-controllers/{id}/sync
public class SyncOmadaClientsRequest
{
    public int Id { get; set; }
}

public class SyncOmadaClientsEndpoint : Endpoint<SyncOmadaClientsRequest, OmadaSyncResult>
{
    private readonly IOmadaControllerService _omadaControllerService;

    public SyncOmadaClientsEndpoint(IOmadaControllerService omadaControllerService)
    {
        _omadaControllerService = omadaControllerService;
    }

    public override void Configure()
    {
        Post("/api/ip-management/omada-controllers/{id}/sync");
        AllowAnonymous();
    }

    public override async Task HandleAsync(SyncOmadaClientsRequest req, CancellationToken ct)
    {
        var result = await _omadaControllerService.SyncClientsAsync(req.Id);
        await Send.OkAsync(result, cancellation: ct);
    }
}

// GET /api/ip-management/omada-controllers/{id}/clients
public class GetOmadaClientsRequest
{
    public int Id { get; set; }
}

public class GetOmadaClientsEndpoint : Endpoint<GetOmadaClientsRequest, IEnumerable<OmadaClient>>
{
    private readonly IOmadaControllerService _omadaControllerService;

    public GetOmadaClientsEndpoint(IOmadaControllerService omadaControllerService)
    {
        _omadaControllerService = omadaControllerService;
    }

    public override void Configure()
    {
        Get("/api/ip-management/omada-controllers/{id}/clients");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetOmadaClientsRequest req, CancellationToken ct)
    {
        var clients = await _omadaControllerService.GetConnectedClientsAsync(req.Id);
        await Send.OkAsync(clients, cancellation: ct);
    }
}
