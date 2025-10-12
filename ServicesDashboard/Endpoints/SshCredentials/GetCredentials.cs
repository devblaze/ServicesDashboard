using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;
using ServicesDashboard.Models;

namespace ServicesDashboard.Endpoints.SshCredentials;

public class GetCredentialsEndpoint : EndpointWithoutRequest<IEnumerable<SshCredentialDto>>
{
    private readonly ServicesDashboardContext _context;

    public GetCredentialsEndpoint(ServicesDashboardContext context)
    {
        _context = context;
    }

    public override void Configure()
    {
        Get("/api/sshcredentials");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var credentials = await _context.SshCredentials
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
            .OrderBy(c => c.Name)
            .ToListAsync(ct);

        await Send.OkAsync(credentials, ct);
    }
}
