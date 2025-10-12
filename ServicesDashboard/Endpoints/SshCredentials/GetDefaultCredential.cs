using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;
using ServicesDashboard.Models;

namespace ServicesDashboard.Endpoints.SshCredentials;

public class GetDefaultCredentialEndpoint : EndpointWithoutRequest<SshCredentialDto>
{
    private readonly ServicesDashboardContext _context;

    public GetDefaultCredentialEndpoint(ServicesDashboardContext context)
    {
        _context = context;
    }

    public override void Configure()
    {
        Get("/api/sshcredentials/default");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var credential = await _context.SshCredentials
            .Where(c => c.IsDefault)
            .Select(c => new SshCredentialDto
            {
                Id = c.Id,
                Name = c.Name,
                Username = c.Username,
                Description = c.Description,
                DefaultPort = c.DefaultPort,
                IsDefault = c.IsDefault,
                CreatedAt = c.CreatedAt
            })
            .FirstOrDefaultAsync(ct);

        if (credential == null)
        {
            HttpContext.Response.StatusCode = 404;
                await HttpContext.Response.WriteAsync(@"{""error"":""No default credential has been set.""}", ct);
                return;
        }

        await Send.OkAsync(credential, ct);
    }
}
