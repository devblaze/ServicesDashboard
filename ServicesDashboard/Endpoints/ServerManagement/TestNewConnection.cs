using FastEndpoints;
using ServicesDashboard.Data;
using ServicesDashboard.Models.Requests;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class TestNewConnectionEndpoint : Endpoint<ConnectionTestRequest, bool>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<TestNewConnectionEndpoint> _logger;
    private readonly ServicesDashboardContext _dbContext;

    public TestNewConnectionEndpoint(
        IServerManagementService serverManagementService,
        ILogger<TestNewConnectionEndpoint> logger,
        ServicesDashboardContext dbContext)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
        _dbContext = dbContext;
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
            var username = req.Username;
            var password = req.Password;

            // If using saved credentials, look up username/password from the credential
            if (req.SshCredentialId.HasValue)
            {
                var credential = await _dbContext.SshCredentials.FindAsync(new object[] { req.SshCredentialId.Value }, ct);
                if (credential != null)
                {
                    username = credential.Username;
                    password = credential.Password;
                }
            }

            var canConnect = await _serverManagementService.TestConnectionAsync(
                req.HostAddress,
                req.SshPort,
                username,
                password
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
