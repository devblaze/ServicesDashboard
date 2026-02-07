using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.VirtualMachines;

namespace ServicesDashboard.Endpoints.VirtualMachines;

public class CreateVMRequest
{
    public int HostServerId { get; set; }
    public string VMName { get; set; } = string.Empty;
    public string OsType { get; set; } = "Ubuntu2404";
    public string Preset { get; set; } = "Small";
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public int? DiskSizeGb { get; set; }
}

public class CreateVMEndpoint : Endpoint<CreateVMRequest, VMOperation>
{
    private readonly IVMManagementService _vmService;
    private readonly ILogger<CreateVMEndpoint> _logger;

    public CreateVMEndpoint(IVMManagementService vmService, ILogger<CreateVMEndpoint> logger)
    {
        _vmService = vmService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/virtualmachines");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CreateVMRequest req, CancellationToken ct)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(req.VMName))
            {
                HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsync(@"{""error"":""VM name is required""}", ct);
                return;
            }

            if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
            {
                HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsync(@"{""error"":""Username and password are required""}", ct);
                return;
            }

            var serviceRequest = new ServicesDashboard.Services.VirtualMachines.CreateVMRequest
            {
                HostServerId = req.HostServerId,
                VMName = req.VMName,
                OsType = Enum.Parse<VmOsType>(req.OsType),
                Preset = Enum.Parse<VMPreset>(req.Preset),
                Username = req.Username,
                Password = req.Password,
                DiskSizeGb = req.DiskSizeGb
            };

            var operation = await _vmService.CreateVMAsync(serviceRequest);
            await Send.CreatedAtAsync<GetVMOperationEndpoint>(
                new { operationId = operation.OperationId },
                operation,
                cancellation: ct);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid VM creation request");
            HttpContext.Response.StatusCode = 400;
            await HttpContext.Response.WriteAsync($@"{{""error"":""{ex.Message.Replace("\"", "\\\"")}""}}", ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating VM");
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
        }
    }
}
