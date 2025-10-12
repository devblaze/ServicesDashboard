using FastEndpoints;
using ServicesDashboard.Models.Requests;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class TestNewConnectionEndpoint : Endpoint<ConnectionTestRequest, bool>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<TestNewConnectionEndpoint> _logger;

    public TestNewConnectionEndpoint(
        IServerManagementService serverManagementService,
        ILogger<TestNewConnectionEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/servermanagement/test-new-connection");
        AllowAnonymous();
    }

    public override async Task HandleAsync(ConnectionTestRequest req, CancellationToken ct)
    {
        try
        {
            var canConnect = await _serverManagementService.TestConnectionAsync(
                req.HostAddress,
                req.SshPort,
                req.Username,
                req.Password
            );
            await Send.OkAsync(canConnect, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing new connection to {HostAddress}", req.HostAddress);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
