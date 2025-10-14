using FastEndpoints;
using ServicesDashboard.Models;
using ServicesDashboard.Services.Servers;
using System.Net;
using System.Net.Sockets;

namespace ServicesDashboard.Endpoints.ServerManagement;

public class GetServersEndpoint : EndpointWithoutRequest<IEnumerable<ManagedServer>>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<GetServersEndpoint> _logger;

    public GetServersEndpoint(
        IServerManagementService serverManagementService,
        ILogger<GetServersEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/servermanagement");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        try
        {
            var servers = await _serverManagementService.GetServersAsync();

            // Get local machine IPs for dashboard server detection
            var localIps = GetLocalIPAddresses();
            var hostname = Dns.GetHostName();

            // Mark servers that match the dashboard server
            foreach (var server in servers)
            {
                server.IsDashboardServer = IsLocalServer(server.HostAddress, localIps, hostname);
            }

            await Send.OkAsync(servers, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting servers");
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Internal server error""}", ct);
            return;
        }
    }

    private static HashSet<string> GetLocalIPAddresses()
    {
        var ips = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Add localhost
        ips.Add("localhost");
        ips.Add("127.0.0.1");
        ips.Add("::1");

        try
        {
            var hostName = Dns.GetHostName();
            var hostEntry = Dns.GetHostEntry(hostName);

            foreach (var ip in hostEntry.AddressList)
            {
                ips.Add(ip.ToString());
            }
        }
        catch
        {
            // Ignore errors in getting local IPs
        }

        return ips;
    }

    private static bool IsLocalServer(string hostAddress, HashSet<string> localIps, string hostname)
    {
        // Check if the host address matches local IPs
        if (localIps.Contains(hostAddress))
        {
            return true;
        }

        // Check if the host address matches the hostname
        if (string.Equals(hostAddress, hostname, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        // Try to resolve the hostname to IP
        try
        {
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
