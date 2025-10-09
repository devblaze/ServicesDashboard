using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;
using ServicesDashboard.Models;
using System.ComponentModel.DataAnnotations;

namespace ServicesDashboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SshCredentialsController : ControllerBase
{
    private readonly ServicesDashboardContext _context;
    private readonly ILogger<SshCredentialsController> _logger;

    public SshCredentialsController(
        ServicesDashboardContext context,
        ILogger<SshCredentialsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SshCredentialDto>>> GetCredentials()
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
            .ToListAsync();

        return Ok(credentials);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SshCredentialDto>> GetCredential(int id)
    {
        var credential = await _context.SshCredentials
            .Where(c => c.Id == id)
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
            .FirstOrDefaultAsync();

        if (credential == null)
        {
            return NotFound();
        }

        return Ok(credential);
    }

    [HttpPost]
    public async Task<ActionResult<SshCredentialDto>> CreateCredential([FromBody] CreateSshCredentialRequest request)
    {
        try
        {
            // Check if a credential with the same name already exists
            if (await _context.SshCredentials.AnyAsync(c => c.Name == request.Name))
            {
                return BadRequest($"A credential with the name '{request.Name}' already exists.");
            }

            // If this is marked as default, unset other defaults
            if (request.IsDefault)
            {
                var existingDefaults = await _context.SshCredentials
                    .Where(c => c.IsDefault)
                    .ToListAsync();

                foreach (var existing in existingDefaults)
                {
                    existing.IsDefault = false;
                }
            }

            var credential = new SshCredential
            {
                Name = request.Name,
                Username = request.Username,
                Password = request.Password, // In production, this should be encrypted
                Description = request.Description,
                DefaultPort = request.DefaultPort ?? 22,
                IsDefault = request.IsDefault,
                CreatedAt = DateTime.UtcNow
            };

            _context.SshCredentials.Add(credential);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created SSH credential: {Name}", credential.Name);

            return CreatedAtAction(nameof(GetCredential), new { id = credential.Id }, new SshCredentialDto
            {
                Id = credential.Id,
                Name = credential.Name,
                Username = credential.Username,
                Description = credential.Description,
                DefaultPort = credential.DefaultPort,
                IsDefault = credential.IsDefault,
                CreatedAt = credential.CreatedAt,
                UsageCount = 0
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating SSH credential");
            return StatusCode(500, "An error occurred while creating the credential.");
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCredential(int id, [FromBody] UpdateSshCredentialRequest request)
    {
        try
        {
            var credential = await _context.SshCredentials.FindAsync(id);
            if (credential == null)
            {
                return NotFound();
            }

            // Check if the new name conflicts with another credential
            if (request.Name != null && request.Name != credential.Name)
            {
                if (await _context.SshCredentials.AnyAsync(c => c.Name == request.Name && c.Id != id))
                {
                    return BadRequest($"A credential with the name '{request.Name}' already exists.");
                }
                credential.Name = request.Name;
            }

            if (request.Username != null)
                credential.Username = request.Username;

            if (request.Password != null)
                credential.Password = request.Password; // Should be encrypted in production

            if (request.Description != null)
                credential.Description = request.Description;

            if (request.DefaultPort.HasValue)
                credential.DefaultPort = request.DefaultPort.Value;

            if (request.IsDefault.HasValue)
            {
                if (request.IsDefault.Value)
                {
                    // Unset other defaults
                    var existingDefaults = await _context.SshCredentials
                        .Where(c => c.IsDefault && c.Id != id)
                        .ToListAsync();

                    foreach (var existing in existingDefaults)
                    {
                        existing.IsDefault = false;
                    }
                }
                credential.IsDefault = request.IsDefault.Value;
            }

            credential.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated SSH credential: {Name}", credential.Name);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating SSH credential {Id}", id);
            return StatusCode(500, "An error occurred while updating the credential.");
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCredential(int id)
    {
        try
        {
            var credential = await _context.SshCredentials
                .Include(c => c.ServersUsingCredential)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (credential == null)
            {
                return NotFound();
            }

            // Check if any servers are using this credential
            if (credential.ServersUsingCredential != null && credential.ServersUsingCredential.Any())
            {
                return BadRequest($"Cannot delete credential '{credential.Name}' because it is being used by {credential.ServersUsingCredential.Count} server(s).");
            }

            _context.SshCredentials.Remove(credential);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted SSH credential: {Name}", credential.Name);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting SSH credential {Id}", id);
            return StatusCode(500, "An error occurred while deleting the credential.");
        }
    }

    [HttpPost("{id}/test")]
    public async Task<ActionResult> TestCredential(int id, [FromBody] TestCredentialRequest request)
    {
        try
        {
            var credential = await _context.SshCredentials.FindAsync(id);
            if (credential == null)
            {
                return NotFound();
            }

            // Test SSH connection using the credential
            using var sshClient = new Renci.SshNet.SshClient(
                request.HostAddress,
                request.Port ?? credential.DefaultPort ?? 22,
                credential.Username,
                credential.Password);

            try
            {
                sshClient.Connect();
                sshClient.Disconnect();

                _logger.LogInformation("Successfully tested SSH credential {Name} on {Host}:{Port}",
                    credential.Name, request.HostAddress, request.Port ?? credential.DefaultPort ?? 22);

                return Ok(new { success = true, message = "Connection successful" });
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Failed to test SSH credential {Name} on {Host}:{Port}: {Error}",
                    credential.Name, request.HostAddress, request.Port ?? credential.DefaultPort ?? 22, ex.Message);

                return Ok(new { success = false, message = $"Connection failed: {ex.Message}" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing SSH credential {Id}", id);
            return StatusCode(500, "An error occurred while testing the credential.");
        }
    }

    [HttpGet("default")]
    public async Task<ActionResult<SshCredentialDto>> GetDefaultCredential()
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
            .FirstOrDefaultAsync();

        if (credential == null)
        {
            return NotFound("No default credential has been set.");
        }

        return Ok(credential);
    }
}

public class TestCredentialRequest
{
    [Required]
    public string HostAddress { get; set; } = string.Empty;
    public int? Port { get; set; }
}