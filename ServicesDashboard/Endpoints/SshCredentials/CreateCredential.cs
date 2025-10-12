using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;
using ServicesDashboard.Models;

namespace ServicesDashboard.Endpoints.SshCredentials;

public class CreateCredentialEndpoint : Endpoint<CreateSshCredentialRequest, SshCredentialDto>
{
    private readonly ServicesDashboardContext _context;
    private readonly ILogger<CreateCredentialEndpoint> _logger;

    public CreateCredentialEndpoint(
        ServicesDashboardContext context,
        ILogger<CreateCredentialEndpoint> logger)
    {
        _context = context;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/sshcredentials");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CreateSshCredentialRequest req, CancellationToken ct)
    {
        try
        {
            // Check if a credential with the same name already exists
            if (await _context.SshCredentials.AnyAsync(c => c.Name == req.Name, ct))
            {
                HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsync($@"{{""error"":""A credential with the name '{req.Name.Replace("\"", "\\\"")}' already exists.""}}", ct);
                return;
            }

            // If this is marked as default, unset other defaults
            if (req.IsDefault)
            {
                var existingDefaults = await _context.SshCredentials
                    .Where(c => c.IsDefault)
                    .ToListAsync(ct);

                foreach (var existing in existingDefaults)
                {
                    existing.IsDefault = false;
                }
            }

            var credential = new SshCredential
            {
                Name = req.Name,
                Username = req.Username,
                Password = req.Password, // In production, this should be encrypted
                Description = req.Description,
                DefaultPort = req.DefaultPort ?? 22,
                IsDefault = req.IsDefault,
                CreatedAt = DateTime.UtcNow
            };

            _context.SshCredentials.Add(credential);
            await _context.SaveChangesAsync(ct);

            _logger.LogInformation("Created SSH credential: {Name}", credential.Name);

            var credentialDto = new SshCredentialDto
            {
                Id = credential.Id,
                Name = credential.Name,
                Username = credential.Username,
                Description = credential.Description,
                DefaultPort = credential.DefaultPort,
                IsDefault = credential.IsDefault,
                CreatedAt = credential.CreatedAt,
                UsageCount = 0
            };

            await Send.CreatedAtAsync<GetCredentialEndpoint>(new { id = credential.Id }, credentialDto, cancellation: ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating SSH credential");
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""An error occurred while creating the credential.""}", ct);
            return;
        }
    }
}
