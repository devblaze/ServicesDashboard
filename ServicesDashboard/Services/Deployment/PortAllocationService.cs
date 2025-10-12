using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Models.Dtos;

namespace ServicesDashboard.Services.Deployment;

public interface IPortAllocationService
{
    Task<AllocatePortResponse> AllocatePortAsync(AllocatePortRequest request);
    Task<List<PortAllocationDto>> GetAllocatedPortsAsync(int serverId);
    Task<List<int>> FindAvailablePortsAsync(int serverId, int count = 1, int startPort = 3000, int endPort = 9999);
    Task<bool> IsPortAvailableAsync(int serverId, int port);
    Task<bool> ReleasePortAsync(int portAllocationId);
    Task<bool> ReleaseDeploymentPortsAsync(int deploymentId);
}

public class PortAllocationService : IPortAllocationService
{
    private readonly ServicesDashboardContext _context;
    private readonly ILogger<PortAllocationService> _logger;

    // Common ports to avoid
    private static readonly HashSet<int> ReservedPorts = new()
    {
        21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 465, 587, 993, 995,
        3306, 5432, 6379, 27017, 1433, 1521  // Database ports
    };

    public PortAllocationService(ServicesDashboardContext context, ILogger<PortAllocationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<AllocatePortResponse> AllocatePortAsync(AllocatePortRequest request)
    {
        int allocatedPort;

        if (request.PreferredPort.HasValue)
        {
            // Try to allocate preferred port
            if (await IsPortAvailableAsync(request.ServerId, request.PreferredPort.Value))
            {
                allocatedPort = request.PreferredPort.Value;
            }
            else
            {
                // Preferred port not available, find next available
                var availablePorts = await FindAvailablePortsAsync(request.ServerId, 1, request.PreferredPort.Value);
                if (!availablePorts.Any())
                {
                    throw new Exception($"No available ports found starting from {request.PreferredPort.Value}");
                }
                allocatedPort = availablePorts.First();
            }
        }
        else
        {
            // Find any available port
            var availablePorts = await FindAvailablePortsAsync(request.ServerId, 1);
            if (!availablePorts.Any())
            {
                throw new Exception("No available ports found");
            }
            allocatedPort = availablePorts.First();
        }

        // Create port allocation
        var allocation = new PortAllocation
        {
            ServerId = request.ServerId,
            DeploymentId = request.DeploymentId,
            Port = allocatedPort,
            ServiceName = request.ServiceName,
            Description = request.Description,
            IsActive = true
        };

        _context.PortAllocations.Add(allocation);
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Allocated port {Port} on server {ServerId} for deployment {DeploymentId}",
            allocatedPort, request.ServerId, request.DeploymentId
        );

        return new AllocatePortResponse
        {
            AllocatedPort = allocatedPort,
            Message = $"Port {allocatedPort} allocated successfully"
        };
    }

    public async Task<List<PortAllocationDto>> GetAllocatedPortsAsync(int serverId)
    {
        var allocations = await _context.PortAllocations
            .Where(p => p.ServerId == serverId && p.IsActive)
            .OrderBy(p => p.Port)
            .ToListAsync();

        return allocations.Select(a => new PortAllocationDto
        {
            Id = a.Id,
            ServerId = a.ServerId,
            DeploymentId = a.DeploymentId,
            Port = a.Port,
            ServiceName = a.ServiceName,
            Description = a.Description,
            IsActive = a.IsActive,
            AllocatedAt = a.AllocatedAt
        }).ToList();
    }

    public async Task<List<int>> FindAvailablePortsAsync(int serverId, int count = 1, int startPort = 3000, int endPort = 9999)
    {
        var allocatedPorts = await _context.PortAllocations
            .Where(p => p.ServerId == serverId && p.IsActive)
            .Select(p => p.Port)
            .ToListAsync();

        var allocatedSet = allocatedPorts.ToHashSet();
        var availablePorts = new List<int>();

        for (int port = startPort; port <= endPort && availablePorts.Count < count; port++)
        {
            if (!allocatedSet.Contains(port) && !ReservedPorts.Contains(port))
            {
                availablePorts.Add(port);
            }
        }

        return availablePorts;
    }

    public async Task<bool> IsPortAvailableAsync(int serverId, int port)
    {
        if (ReservedPorts.Contains(port))
            return false;

        var isAllocated = await _context.PortAllocations
            .AnyAsync(p => p.ServerId == serverId && p.Port == port && p.IsActive);

        return !isAllocated;
    }

    public async Task<bool> ReleasePortAsync(int portAllocationId)
    {
        var allocation = await _context.PortAllocations.FindAsync(portAllocationId);
        if (allocation == null)
            return false;

        allocation.IsActive = false;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Released port {Port} on server {ServerId}", allocation.Port, allocation.ServerId);

        return true;
    }

    public async Task<bool> ReleaseDeploymentPortsAsync(int deploymentId)
    {
        var allocations = await _context.PortAllocations
            .Where(p => p.DeploymentId == deploymentId && p.IsActive)
            .ToListAsync();

        foreach (var allocation in allocations)
        {
            allocation.IsActive = false;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Released {Count} ports for deployment {DeploymentId}", allocations.Count, deploymentId);

        return true;
    }
}
