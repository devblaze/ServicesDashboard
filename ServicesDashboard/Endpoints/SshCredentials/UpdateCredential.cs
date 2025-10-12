using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;
using ServicesDashboard.Models;

namespace ServicesDashboard.Endpoints.SshCredentials;

public class UpdateCredentialRequest
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string? Description { get; set; }
    public int? DefaultPort { get; set; }
    public bool? IsDefault { get; set; }
}

public class UpdateCredentialEndpoint : Endpoint<UpdateCredentialRequest>
{
    private readonly ServicesDashboardContext _context;
    private readonly ILogger<UpdateCredentialEndpoint> _logger;

    public UpdateCredentialEndpoint(
        ServicesDashboardContext context,
        ILogger<UpdateCredentialEndpoint> logger)
    {
        _context = context;
        _logger = logger;
    }

    public override void Configure()
    {
        Put("/api/sshcredentials/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(UpdateCredentialRequest req, CancellationToken ct)
    {
        try
        {
            var credential = await _context.SshCredentials.FindAsync(new object[] { req.Id }, ct);
            if (credential == null)
            {
                await Send.NotFoundAsync(ct);
            return;
            }

            // Check if the new name conflicts with another credential
            if (req.Name != null && req.Name != credential.Name)
            {
                if (await _context.SshCredentials.AnyAsync(c => c.Name == req.Name && c.Id != req.Id, ct))
                {
                    HttpContext.Response.StatusCode = 400;
                    await HttpContext.Response.WriteAsync($@"{{""error"":""A credential with the name '{req.Name.Replace("\"", "\\\"")}' already exists.""}}", ct);
                    return;
                }
                credential.Name = req.Name;
            }

            if (req.Username != null)
                credential.Username = req.Username;

            if (req.Password != null)
                credential.Password = req.Password; // Should be encrypted in production

            if (req.Description != null)
                credential.Description = req.Description;

            if (req.DefaultPort.HasValue)
                credential.DefaultPort = req.DefaultPort.Value;

            if (req.IsDefault.HasValue)
            {
                if (req.IsDefault.Value)
                {
                    // Unset other defaults
                    var existingDefaults = await _context.SshCredentials
                        .Where(c => c.IsDefault && c.Id != req.Id)
                        .ToListAsync(ct);

                    foreach (var existing in existingDefaults)
                    {
                        existing.IsDefault = false;
                    }
                }
                credential.IsDefault = req.IsDefault.Value;
            }

            credential.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);

            _logger.LogInformation("Updated SSH credential: {Name}", credential.Name);

            await Send.NoContentAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating SSH credential {Id}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""An error occurred while updating the credential.""}", ct);
            return;
        }
    }
}
