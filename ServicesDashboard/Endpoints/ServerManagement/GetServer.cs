using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Servers;
using System.Net;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class GetServerRequest
{
    public int Id { get; set; }
}

public class GetServerEndpoint : Endpoint<GetServerRequest, ManagedServer>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<GetServerEndpoint> _logger;

    public GetServerEndpoint(
        IServerManagementService serverManagementService,
        ILogger<GetServerEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/servermanagement/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetServerRequest req, CancellationToken ct)
    {
        try
        {
            var server = await _serverManagementService.GetServerAsync(req.Id);
            if (server == null)
            {
                await Send.NotFoundAsync(ct);
                return;
            }

            // Mark if this is the dashboard server
            server.IsDashboardServer = IsLocalServer(server.HostAddress);

            await Send.OkAsync(server, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting server {ServerId}", req.Id);
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }

    private static bool IsLocalServer(string hostAddress)
    {
        var localIps = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "localhost",
            "127.0.0.1",
            "::1"
        };

        try
        {
            var hostName = Dns.GetHostName();
            var hostEntry = Dns.GetHostEntry(hostName);

            foreach (var ip in hostEntry.AddressList)
            {
                localIps.Add(ip.ToString());
            }

            // Check if the host address matches local IPs
            if (localIps.Contains(hostAddress))
            {
                return true;
            }

            // Check if the host address matches the hostname
            if (string.Equals(hostAddress, hostName, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            // Try to resolve the hostname to IP
            var addresses = Dns.GetHostAddresses(hostAddress);
            foreach (var addr in addresses)
            {
                if (localIps.Contains(addr.ToString()))
                {
                    return true;
                }
            }
        }
        catch
        {
            // If DNS resolution fails, it's not a local server
        }

        return false;
    }
}
