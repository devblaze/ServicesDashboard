using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;

namespace ServicesDashboard.Endpoints.SshCredentials;

public class DeleteCredentialRequest
{
    public int Id { get; set; }
}

public class DeleteCredentialEndpoint : Endpoint<DeleteCredentialRequest>
{
    private readonly ServicesDashboardContext _context;
    private readonly ILogger<DeleteCredentialEndpoint> _logger;

    public DeleteCredentialEndpoint(
        ServicesDashboardContext context,
        ILogger<DeleteCredentialEndpoint> logger)
    {
        _context = context;
        _logger = logger;
    }

    public override void Configure()
    {
        Delete("/api/sshcredentials/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(DeleteCredentialRequest req, CancellationToken ct)
    {
        try
        {
            var credential = await _context.SshCredentials
                .Include(c => c.ServersUsingCredential)
                .FirstOrDefaultAsync(c => c.Id == req.Id, ct);

            if (credential == null)
            {
                await Send.NotFoundAsync(ct);
            return;
            }

            // Check if any servers are using this credential
            if (credential.ServersUsingCredential != null && credential.ServersUsingCredential.Any())
            {
                HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsync($@"{{""error"":""Cannot delete credential '{credential.Name.Replace("\"", "\\\"")}' because it is being used by {credential.ServersUsingCredential.Count} server(s).""}}", ct);
                return;
            }

            _context.SshCredentials.Remove(credential);
            await _context.SaveChangesAsync(ct);

            _logger.LogInformation("Deleted SSH credential: {Name}", credential.Name);

            await Send.NoContentAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting SSH credential {Id}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""An error occurred while deleting the credential.""}", ct);
            return;
        }
    }
}
