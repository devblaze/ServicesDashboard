using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Models.SelfHosted;
using ServicesDashboard.Services.Docker;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Services.SelfHosted;

public interface IPortManagementService
{
    Task<PortConflictResult> DetectConflictsAsync(int serverId, List<int> requestedPorts);
    Task<List<int>> SuggestAvailablePortsAsync(int serverId, int count, int? rangeStart = null, int? rangeEnd = null);
    Task<PortAllocation> AllocatePortAsync(PortAllocationRequest request);
    Task ReleasePortAsync(int serverId, int port);
    Task<List<PortAllocation>> GetAllocatedPortsAsync(int serverId);
    Task<bool> IsPortAvailableAsync(int serverId, int port);
    Task SyncDockerPortsAsync(int serverId);
}

public class PortManagementService : IPortManagementService
{
    private readonly ServicesDashboardContext _context;
    private readonly IServerManagementService _serverManagementService;
    private readonly ILogger<PortManagementService> _logger;

    // System reserved ports (1-1024)
    private static readonly HashSet<int> SystemReservedPorts =
        Enumerable.Range(1, 1024).ToHashSet();

    // Common service ports to avoid
    private static readonly HashSet<int> CommonServicePorts = new HashSet<int>
    {
        22, 80, 443, 3306, 5432, 6379, 27017, 8080, 8443, 9000
    };

    public PortManagementService(
        ServicesDashboardContext context,
        IServerManagementService serverManagementService,
        ILogger<PortManagementService> logger)
    {
        _context = context;
        _serverManagementService = serverManagementService;
        _logger = logger;
    }

    public async Task<PortConflictResult> DetectConflictsAsync(int serverId, List<int> requestedPorts)
    {
        var conflicts = new List<PortConflict>();

        // Get all allocated ports on server
        var allocatedPorts = await _context.PortAllocations
            .Where(p => p.ServerId == serverId && p.Status == PortAllocationStatus.InUse)
            .ToListAsync();

        foreach (var port in requestedPorts)
        {
            // Check system reserved
            if (SystemReservedPorts.Contains(port))
            {
                conflicts.Add(new PortConflict
                {
                    Port = port,
                    ConflictType = "System Reserved",
                    ConflictsWith = "System (ports 1-1024)"
                });
                continue;
            }

            // Check allocated ports
            var allocation = allocatedPorts.FirstOrDefault(p => p.Port == port);
            if (allocation != null)
            {
                conflicts.Add(new PortConflict
                {
                    Port = port,
                    ConflictType = allocation.AllocationType.ToString(),
                    ConflictsWith = allocation.ServiceName ?? allocation.ServiceId ?? "Unknown Service"
                });
            }
        }

        var result = new PortConflictResult
        {
            HasConflicts = conflicts.Any(),
            Conflicts = conflicts
        };

        // Suggest alternatives if there are conflicts
        if (result.HasConflicts)
        {
            result.SuggestedPorts = await SuggestAvailablePortsAsync(serverId, requestedPorts.Count);
        }

        return result;
    }

    public async Task<List<int>> SuggestAvailablePortsAsync(int serverId, int count, int? rangeStart = null, int? rangeEnd = null)
    {
        var start = rangeStart ?? 8000;
        var end = rangeEnd ?? 9999;

        _logger.LogInformation("Suggesting {Count} available ports for server {ServerId} in range {Start}-{End}",
            count, serverId, start, end);

        // Get allocated ports
        var allocatedPortsList = await _context.PortAllocations
            .Where(p => p.ServerId == serverId && p.Status == PortAllocationStatus.InUse)
            .Select(p => p.Port)
            .ToListAsync();
        var allocatedPorts = allocatedPortsList.ToHashSet();

        var suggestions = new List<int>();
        var currentPort = start;

        while (suggestions.Count < count && currentPort <= end)
        {
            if (!allocatedPorts.Contains(currentPort) &&
                !SystemReservedPorts.Contains(currentPort) &&
                !CommonServicePorts.Contains(currentPort))
            {
                suggestions.Add(currentPort);
            }
            currentPort++;
        }

        if (suggestions.Count < count)
        {
            _logger.LogWarning("Could only suggest {Found} ports out of {Requested} requested",
                suggestions.Count, count);
        }

        return suggestions;
    }

    public async Task<PortAllocation> AllocatePortAsync(PortAllocationRequest request)
    {
        _logger.LogInformation("Allocating port {Port} on server {ServerId} for {ServiceName}",
            request.Port, request.ServerId, request.ServiceName);

        // Check if port is available
        var isAvailable = await IsPortAvailableAsync(request.ServerId, request.Port);
        if (!isAvailable)
        {
            throw new InvalidOperationException($"Port {request.Port} is not available on server {request.ServerId}");
        }

        // Check if allocation already exists (mark as in use)
        var existing = await _context.PortAllocations
            .FirstOrDefaultAsync(p => p.ServerId == request.ServerId &&
                                    p.Port == request.Port);

        if (existing != null)
        {
            existing.Status = PortAllocationStatus.InUse;
            existing.AllocationType = request.AllocationType;
            existing.ServiceId = request.ServiceId;
            existing.ServiceName = request.ServiceName;
            existing.AllocatedAt = DateTime.UtcNow;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.ReleasedAt = null;

            await _context.SaveChangesAsync();
            return existing;
        }

        // Create new allocation
        var allocation = new PortAllocation
        {
            ServerId = request.ServerId,
            Port = request.Port,
            Status = PortAllocationStatus.InUse,
            AllocationType = request.AllocationType,
            ServiceId = request.ServiceId,
            ServiceName = request.ServiceName,
            AllocatedAt = DateTime.UtcNow
        };

        _context.PortAllocations.Add(allocation);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Port {Port} allocated successfully for {ServiceName}",
            request.Port, request.ServiceName);

        return allocation;
    }

    public async Task ReleasePortAsync(int serverId, int port)
    {
        _logger.LogInformation("Releasing port {Port} on server {ServerId}", port, serverId);

        var allocation = await _context.PortAllocations
            .FirstOrDefaultAsync(p => p.ServerId == serverId &&
                                    p.Port == port &&
                                    p.Status == PortAllocationStatus.InUse);

        if (allocation != null)
        {
            allocation.Status = PortAllocationStatus.Available;
            allocation.ReleasedAt = DateTime.UtcNow;
            allocation.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Port {Port} released successfully", port);
        }
    }

    public async Task<List<PortAllocation>> GetAllocatedPortsAsync(int serverId)
    {
        return await _context.PortAllocations
            .Where(p => p.ServerId == serverId && p.Status == PortAllocationStatus.InUse)
            .OrderBy(p => p.Port)
            .ToListAsync();
    }

    public async Task<bool> IsPortAvailableAsync(int serverId, int port)
    {
        // Check system reserved
        if (SystemReservedPorts.Contains(port))
        {
            return false;
        }

        // Check if allocated
        var allocated = await _context.PortAllocations
            .AnyAsync(p => p.ServerId == serverId &&
                          p.Port == port &&
                          p.Status == PortAllocationStatus.InUse);

        return !allocated;
    }

    public async Task SyncDockerPortsAsync(int serverId)
    {
        _logger.LogInformation("Syncing Docker ports for server {ServerId}", serverId);

        try
        {
            // Get all Docker containers on server
            var dockerServices = await _serverManagementService.DiscoverDockerServicesAsync(serverId);

            foreach (var service in dockerServices.Services)
            {
                if (service.Ports == null || service.Ports.Count == 0)
                    continue;

                foreach (var portMapping in service.Ports)
                {
                    if (!portMapping.HostPort.HasValue)
                        continue;

                    var port = portMapping.HostPort.Value;

                    // Check if allocation exists
                    var existing = await _context.PortAllocations
                        .FirstOrDefaultAsync(p => p.ServerId == serverId &&
                                                p.Port == port);

                    if (existing == null)
                    {
                        // Create new allocation
                        var allocation = new PortAllocation
                        {
                            ServerId = serverId,
                            Port = port,
                            Status = PortAllocationStatus.InUse,
                            AllocationType = PortAllocationType.Docker,
                            ServiceId = service.ContainerId,
                            ServiceName = service.Name,
                            AllocatedAt = DateTime.UtcNow
                        };

                        _context.PortAllocations.Add(allocation);
                    }
                    else if (existing.ServiceId != service.ContainerId)
                    {
                        // Update existing allocation
                        existing.Status = PortAllocationStatus.InUse;
                        existing.AllocationType = PortAllocationType.Docker;
                        existing.ServiceId = service.ContainerId;
                        existing.ServiceName = service.Name;
                        existing.UpdatedAt = DateTime.UtcNow;
                    }
                }
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Docker ports synced successfully for server {ServerId}", serverId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to sync Docker ports for server {ServerId}", serverId);
            throw;
        }
    }
}
