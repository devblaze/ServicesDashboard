using FastEndpoints;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class TestConnectionRequest
{
    public int Id { get; set; }
}

public class TestConnectionEndpoint : Endpoint<TestConnectionRequest, bool>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<TestConnectionEndpoint> _logger;

    public TestConnectionEndpoint(
        IServerManagementService serverManagementService,
        ILogger<TestConnectionEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/servermanagement/{id}/test-connection");
        AllowAnonymous();
    }

    public override async Task HandleAsync(TestConnectionRequest req, CancellationToken ct)
    {
        try
        {
            var server = await _serverManagementService.GetServerAsync(req.Id);
            if (server == null)
            {
                await Send.NotFoundAsync(ct);
            return;
            }

            var canConnect = await _serverManagementService.TestConnectionAsync(server);
            await Send.OkAsync(canConnect, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing connection for server {ServerId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
