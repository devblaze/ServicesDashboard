using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.Services;

public class GetServersForServicesEndpoint : EndpointWithoutRequest<IEnumerable<ServerSummaryDto>>
{
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<GetServersForServicesEndpoint> _logger;

    public GetServersForServicesEndpoint(
        IServerManagementService serverManagementService,
        ILogger<GetServersForServicesEndpoint> logger)
    {
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/services/servers");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        try
        {
            var servers = await _serverManagementService.GetServersAsync();
            var serverSummaries = servers.Select(s => new ServerSummaryDto
            {
                Id = s.Id,
                Name = s.Name,
                HostAddress = s.HostAddress,
                Status = s.Status.ToString(),
                Type = s.Type.ToString(),
                LastCheckTime = s.LastCheckTime
            }).ToList();

            await Send.OkAsync(serverSummaries, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get servers for services");
            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync(@"{""error"":""Failed to retrieve servers""}", ct);
            return;
        }
    }
}
