using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;
using ServicesDashboard.Models;

namespace ServicesDashboard.Endpoints.SshCredentials;

public class GetCredentialRequest
{
    public int Id { get; set; }
}

public class GetCredentialEndpoint : Endpoint<GetCredentialRequest, SshCredentialDto>
{
    private readonly ServicesDashboardContext _context;

    public GetCredentialEndpoint(ServicesDashboardContext context)
    {
        _context = context;
    }

    public override void Configure()
    {
        Get("/api/sshcredentials/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetCredentialRequest req, CancellationToken ct)
    {
        var credential = await _context.SshCredentials
            .Where(c => c.Id == req.Id)
            .Select(c => new SshCredentialDto
            {
                Id = c.Id,
                Name = c.Name,
                Username = c.Username,
                Description = c.Description,
                DefaultPort = c.DefaultPort,
                IsDefault = c.IsDefault,
                CreatedAt = c.CreatedAt,
                UsageCount = c.ServersUsingCredential != null ? c.ServersUsingCredential.Count : 0
            })
            .FirstOrDefaultAsync(ct);

        if (credential == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.OkAsync(credential, ct);
    }
}
