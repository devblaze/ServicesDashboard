using FastEndpoints;
using ServicesDashboard.Data;
using System.ComponentModel.DataAnnotations;

namespace ServicesDashboard.Endpoints.SshCredentials;

public class TestCredentialRequest
{
    public int Id { get; set; }

    [Required]
    public string HostAddress { get; set; } = string.Empty;
    public int? Port { get; set; }
}

public class TestCredentialEndpoint : Endpoint<TestCredentialRequest>
{
    private readonly ServicesDashboardContext _context;
    private readonly ILogger<TestCredentialEndpoint> _logger;

    public TestCredentialEndpoint(
        ServicesDashboardContext context,
        ILogger<TestCredentialEndpoint> logger)
    {
        _context = context;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/sshcredentials/{id}/test");
        AllowAnonymous();
    }

    public override async Task HandleAsync(TestCredentialRequest req, CancellationToken ct)
    {
        try
        {
            var credential = await _context.SshCredentials.FindAsync(new object[] { req.Id }, ct);
            if (credential == null)
            {
                await Send.NotFoundAsync(ct);
            return;
            }

            // Test SSH connection using the credential
            using var sshClient = new Renci.SshNet.SshClient(
                req.HostAddress,
                req.Port ?? credential.DefaultPort ?? 22,
                credential.Username,
                credential.Password);

            try
            {
                sshClient.Connect();
                sshClient.Disconnect();

                _logger.LogInformation("Successfully tested SSH credential {Name} on {Host}:{Port}",
                    credential.Name, req.HostAddress, req.Port ?? credential.DefaultPort ?? 22);

                await Send.OkAsync(new { success = true, message = "Connection successful" }, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Failed to test SSH credential {Name} on {Host}:{Port}: {Error}",
                    credential.Name, req.HostAddress, req.Port ?? credential.DefaultPort ?? 22, ex.Message);

                await Send.OkAsync(new { success = false, message = $"Connection failed: {ex.Message}" }, ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing SSH credential {Id}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""An error occurred while testing the credential.""}", ct);
            return;
        }
    }
}
