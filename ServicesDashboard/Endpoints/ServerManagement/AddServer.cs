using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Requests;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class AddServerEndpoint : Endpoint<CreateUpdateServerRequest, ManagedServer>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<AddServerEndpoint> _logger;

    public AddServerEndpoint(
        IServerManagementService serverManagementService,
        ILogger<AddServerEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/servermanagement");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CreateUpdateServerRequest req, CancellationToken ct)
    {
        try
        {
            var server = new ManagedServer
            {
                Name = req.Name,
                HostAddress = req.HostAddress,
                SshPort = req.SshPort,
                Username = req.Username,
                EncryptedPassword = req.Password, // Will be encrypted in service
                Type = Enum.Parse<ServerType>(req.Type ?? "Server"),
                Tags = req.Tags,
                ParentServerId = req.ParentServerId
            };

            var addedServer = await _serverManagementService.AddServerAsync(server);
            await Send.CreatedAtAsync<GetServerEndpoint>(new { id = addedServer.Id }, addedServer, cancellation: ct);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("already exists"))
        {
            _logger.LogWarning("Attempted to add duplicate server: {HostAddress}", req.HostAddress);
            HttpContext.Response.StatusCode = 400;
            var escapedMessage = ex.Message.Replace("\"", "\\\"");
            await HttpContext.Response.WriteAsync($@"{{""error"":""DuplicateServer"",""message"":""{escapedMessage}""}}", ct);
            return;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding server");
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }
}
