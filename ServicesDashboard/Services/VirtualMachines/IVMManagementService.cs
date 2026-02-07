using ServicesDashboard.Models;

namespace ServicesDashboard.Services.VirtualMachines;

public interface IVMManagementService
{
    Task<VMOperation> CreateVMAsync(CreateVMRequest request);
    Task<VMOperation?> GetOperationAsync(Guid operationId);
    Task<VMOperation?> GetOperationByIdAsync(int id);
    Task<IEnumerable<VMOperation>> GetOperationsAsync(int? hostServerId = null);
    Task<IEnumerable<CloudImage>> GetAvailableImagesAsync();
    Task<IEnumerable<UnraidServerInfo>> GetUnraidServersAsync();
    Task<bool> CancelOperationAsync(Guid operationId);
    Task<bool> IsUnraidServerAsync(int serverId);
    Task<IEnumerable<VMPresetInfo>> GetPresetsAsync();
}

public class CreateVMRequest
{
    public int HostServerId { get; set; }
    public string VMName { get; set; } = string.Empty;
    public VmOsType OsType { get; set; }
    public VMPreset Preset { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public int? DiskSizeGb { get; set; }
}

public class UnraidServerInfo
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string HostAddress { get; set; } = string.Empty;
    public ServerStatus Status { get; set; }
}

public class VMPresetInfo
{
    public VMPreset Preset { get; set; }
    public string Label { get; set; } = string.Empty;
    public int RamMb { get; set; }
    public int VCpus { get; set; }
    public string Description { get; set; } = string.Empty;
}
