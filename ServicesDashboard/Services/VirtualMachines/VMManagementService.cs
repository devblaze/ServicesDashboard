using System.Text;
using Microsoft.EntityFrameworkCore;
using Renci.SshNet;
using ServicesDashboard.Data;
using ServicesDashboard.Models;

namespace ServicesDashboard.Services.VirtualMachines;

public class VMManagementService : IVMManagementService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<VMManagementService> _logger;
    private readonly VMOperationQueue _operationQueue;

    private static readonly Dictionary<VMPreset, (int RamMb, int VCpus, string Label)> PresetConfigs = new()
    {
        [VMPreset.Small] = (4096, 2, "Small - 4GB RAM, 2 vCPUs"),
        [VMPreset.Medium] = (8192, 4, "Medium - 8GB RAM, 4 vCPUs"),
        [VMPreset.Large] = (16384, 8, "Large - 16GB RAM, 8 vCPUs"),
        [VMPreset.Custom] = (0, 0, "Custom Configuration")
    };

    public VMManagementService(
        IServiceProvider serviceProvider,
        ILogger<VMManagementService> logger,
        VMOperationQueue operationQueue)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _operationQueue = operationQueue;
    }

    public async Task<VMOperation> CreateVMAsync(CreateVMRequest request)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();

        // Validate host server exists and is Unraid
        var hostServer = await context.ManagedServers.FindAsync(request.HostServerId);
        if (hostServer == null)
        {
            throw new InvalidOperationException($"Host server with ID {request.HostServerId} not found");
        }

        if (!await IsUnraidServerInternalAsync(context, hostServer))
        {
            throw new InvalidOperationException("Host server must be an Unraid server");
        }

        // Check for duplicate VM name on same host
        var existingVm = await context.VMOperations
            .AnyAsync(v => v.HostServerId == request.HostServerId &&
                          v.VMName == request.VMName &&
                          v.Status != VMOperationStatus.Failed &&
                          v.Status != VMOperationStatus.Cancelled);
        if (existingVm)
        {
            throw new InvalidOperationException($"A VM with name '{request.VMName}' already exists or is being created on this host");
        }

        // Get preset configuration
        var (ramMb, vcpus, _) = PresetConfigs[request.Preset];

        // Create operation record
        var operation = new VMOperation
        {
            HostServerId = request.HostServerId,
            VMName = request.VMName,
            OperationType = VMOperationType.Create,
            OsType = request.OsType,
            Preset = request.Preset,
            Username = request.Username,
            EncryptedPassword = EncryptPassword(request.Password),
            RamMb = ramMb,
            VCpus = vcpus,
            DiskSizeGb = request.DiskSizeGb ?? 50,
            Status = VMOperationStatus.Pending,
            CurrentStage = "Queued for processing"
        };

        context.VMOperations.Add(operation);
        await context.SaveChangesAsync();

        // Queue for background processing
        _operationQueue.Enqueue(operation.OperationId);
        _logger.LogInformation("Queued VM creation operation {OperationId} for VM {VMName} on host {HostId}",
            operation.OperationId, request.VMName, request.HostServerId);

        return operation;
    }

    public async Task<VMOperation?> GetOperationAsync(Guid operationId)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();

        return await context.VMOperations
            .Include(o => o.HostServer)
            .Include(o => o.CreatedServer)
            .FirstOrDefaultAsync(o => o.OperationId == operationId);
    }

    public async Task<VMOperation?> GetOperationByIdAsync(int id)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();

        return await context.VMOperations
            .Include(o => o.HostServer)
            .Include(o => o.CreatedServer)
            .FirstOrDefaultAsync(o => o.Id == id);
    }

    public async Task<IEnumerable<VMOperation>> GetOperationsAsync(int? hostServerId = null)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();

        var query = context.VMOperations
            .Include(o => o.HostServer)
            .Include(o => o.CreatedServer)
            .AsQueryable();

        if (hostServerId.HasValue)
        {
            query = query.Where(o => o.HostServerId == hostServerId.Value);
        }

        return await query
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<CloudImage>> GetAvailableImagesAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();

        // Ensure all default images exist in database
        foreach (var (osType, config) in CloudImageDefaults.ImageConfigs)
        {
            var existing = await context.CloudImages.FirstOrDefaultAsync(i => i.OsType == osType);
            if (existing == null)
            {
                context.CloudImages.Add(new CloudImage
                {
                    OsType = osType,
                    DisplayName = config.DisplayName,
                    DownloadUrl = config.DownloadUrl,
                    FileName = config.FileName,
                    IsDownloaded = false
                });
            }
        }
        await context.SaveChangesAsync();

        return await context.CloudImages.ToListAsync();
    }

    public async Task<IEnumerable<UnraidServerInfo>> GetUnraidServersAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();

        var servers = await context.ManagedServers
            .Where(s => s.Status == ServerStatus.Online || s.Status == ServerStatus.Warning)
            .ToListAsync();

        var unraidServers = new List<UnraidServerInfo>();

        foreach (var server in servers)
        {
            if (await IsUnraidServerInternalAsync(context, server))
            {
                unraidServers.Add(new UnraidServerInfo
                {
                    Id = server.Id,
                    Name = server.Name,
                    HostAddress = server.HostAddress,
                    Status = server.Status
                });
            }
        }

        return unraidServers;
    }

    public async Task<bool> CancelOperationAsync(Guid operationId)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();

        var operation = await context.VMOperations.FirstOrDefaultAsync(o => o.OperationId == operationId);
        if (operation == null)
        {
            return false;
        }

        if (operation.Status == VMOperationStatus.Ready ||
            operation.Status == VMOperationStatus.Failed ||
            operation.Status == VMOperationStatus.Cancelled)
        {
            return false;
        }

        operation.Status = VMOperationStatus.Cancelled;
        operation.CurrentStage = "Operation cancelled by user";
        operation.CompletedAt = DateTime.UtcNow;
        operation.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();
        _logger.LogInformation("Cancelled VM operation {OperationId}", operationId);

        return true;
    }

    public async Task<bool> IsUnraidServerAsync(int serverId)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();

        var server = await context.ManagedServers.FindAsync(serverId);
        if (server == null)
        {
            return false;
        }

        return await IsUnraidServerInternalAsync(context, server);
    }

    public Task<IEnumerable<VMPresetInfo>> GetPresetsAsync()
    {
        var presets = PresetConfigs
            .Where(p => p.Key != VMPreset.Custom)
            .Select(p => new VMPresetInfo
            {
                Preset = p.Key,
                Label = p.Value.Label,
                RamMb = p.Value.RamMb,
                VCpus = p.Value.VCpus,
                Description = $"{p.Value.RamMb / 1024}GB RAM, {p.Value.VCpus} vCPUs"
            })
            .ToList();

        return Task.FromResult<IEnumerable<VMPresetInfo>>(presets);
    }

    private async Task<bool> IsUnraidServerInternalAsync(ServicesDashboardContext context, ManagedServer server)
    {
        try
        {
            // First check if we have cached system info indicating Unraid
            if (!string.IsNullOrEmpty(server.OperatingSystem) &&
                server.OperatingSystem.Contains("unraid", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            // Check via SSH
            using var client = CreateSshClient(server);
            client.Connect();
            var result = ExecuteCommand(client, "cat /etc/unraid-version 2>/dev/null || echo 'NOT_UNRAID'");
            client.Disconnect();

            return !result.Contains("NOT_UNRAID");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to check if server {ServerId} is Unraid", server.Id);
            return false;
        }
    }

    private SshClient CreateSshClient(ManagedServer server)
    {
        var plainPassword = DecryptPassword(server.EncryptedPassword ?? "");
        var connectionInfo = new Renci.SshNet.ConnectionInfo(
            server.HostAddress,
            server.SshPort ?? 22,
            server.Username ?? "root",
            new PasswordAuthenticationMethod(server.Username ?? "root", plainPassword));

        connectionInfo.Timeout = TimeSpan.FromSeconds(30);
        return new SshClient(connectionInfo);
    }

    private string ExecuteCommand(SshClient client, string commandText)
    {
        using var command = client.CreateCommand(commandText);
        var result = command.Execute();
        return result?.Trim() ?? "";
    }

    private string EncryptPassword(string password)
    {
        if (string.IsNullOrEmpty(password))
            return "";

        try
        {
            return Convert.ToBase64String(Encoding.UTF8.GetBytes(password));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to encrypt password");
            return password;
        }
    }

    private string DecryptPassword(string encryptedPassword)
    {
        if (string.IsNullOrEmpty(encryptedPassword))
            return "";

        try
        {
            return Encoding.UTF8.GetString(Convert.FromBase64String(encryptedPassword));
        }
        catch (FormatException)
        {
            return encryptedPassword;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to decrypt password");
            return encryptedPassword;
        }
    }
}

/// <summary>
/// Thread-safe queue for VM operations to be processed by the background worker
/// </summary>
public class VMOperationQueue
{
    private readonly Queue<Guid> _queue = new();
    private readonly SemaphoreSlim _semaphore = new(1, 1);

    public void Enqueue(Guid operationId)
    {
        _semaphore.Wait();
        try
        {
            _queue.Enqueue(operationId);
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<Guid?> DequeueAsync(CancellationToken cancellationToken = default)
    {
        await _semaphore.WaitAsync(cancellationToken);
        try
        {
            if (_queue.Count > 0)
            {
                return _queue.Dequeue();
            }
            return null;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public int Count
    {
        get
        {
            _semaphore.Wait();
            try
            {
                return _queue.Count;
            }
            finally
            {
                _semaphore.Release();
            }
        }
    }
}
