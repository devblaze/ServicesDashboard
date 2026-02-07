using System.Text;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Renci.SshNet;
using ServicesDashboard.Data;
using ServicesDashboard.Hubs;
using ServicesDashboard.Models;

namespace ServicesDashboard.Services.VirtualMachines;

public class VMCreationWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<VMCreationWorker> _logger;
    private readonly IHubContext<DiscoveryNotificationHub, IDiscoveryNotificationClient> _hubContext;
    private readonly VMOperationQueue _operationQueue;

    private const string CloudImagesPath = "/mnt/user/domains/cloud-images";
    private const string VMBasePath = "/mnt/user/domains";

    public VMCreationWorker(
        IServiceProvider serviceProvider,
        ILogger<VMCreationWorker> logger,
        IHubContext<DiscoveryNotificationHub, IDiscoveryNotificationClient> hubContext,
        VMOperationQueue operationQueue)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _hubContext = hubContext;
        _operationQueue = operationQueue;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("VM Creation Worker started at {Time}", DateTime.UtcNow);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var operationId = await _operationQueue.DequeueAsync(stoppingToken);

                if (operationId.HasValue)
                {
                    _logger.LogInformation("Processing VM creation operation {OperationId}", operationId.Value);
                    await ProcessVMCreationAsync(operationId.Value, stoppingToken);
                    _logger.LogInformation("Finished processing VM creation operation {OperationId}", operationId.Value);
                }
                else
                {
                    // No operations in queue, wait before checking again
                    await Task.Delay(1000, stoppingToken);
                }
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("VM Creation Worker cancelled");
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in VM Creation Worker main loop");
                await Task.Delay(5000, stoppingToken);
            }
        }

        _logger.LogInformation("VM Creation Worker stopped at {Time}", DateTime.UtcNow);
    }

    private async Task ProcessVMCreationAsync(Guid operationId, CancellationToken ct)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();

        var operation = await context.VMOperations
            .Include(o => o.HostServer)
            .FirstOrDefaultAsync(o => o.OperationId == operationId, ct);

        if (operation == null)
        {
            _logger.LogWarning("VM operation {OperationId} not found", operationId);
            return;
        }

        if (operation.Status == VMOperationStatus.Cancelled)
        {
            _logger.LogInformation("VM operation {OperationId} was cancelled, skipping", operationId);
            return;
        }

        SshClient? client = null;

        try
        {
            // Connect to host server
            client = CreateSshClient(operation.HostServer);
            client.Connect();

            var vmDir = $"{VMBasePath}/{operation.VMName}";
            var diskPath = $"{vmDir}/{operation.VMName}.qcow2";
            var cloudInitIsoPath = $"{vmDir}/{operation.VMName}-cloud-init.iso";

            // Stage 1: Ensure cloud image is downloaded
            await UpdateStatusAsync(context, operation, VMOperationStatus.DownloadingImage, 10, "Checking cloud image...");
            var imagePath = await EnsureImageDownloadedAsync(context, client, operation.OsType, ct);

            // Check for cancellation
            await context.Entry(operation).ReloadAsync(ct);
            if (operation.Status == VMOperationStatus.Cancelled) return;

            // Stage 2: Prepare cloud-init
            await UpdateStatusAsync(context, operation, VMOperationStatus.PreparingCloudInit, 30, "Preparing cloud-init configuration...");
            await PrepareCloudInitAsync(client, operation, vmDir, cloudInitIsoPath);

            // Check for cancellation
            await context.Entry(operation).ReloadAsync(ct);
            if (operation.Status == VMOperationStatus.Cancelled) return;

            // Stage 3: Create VM disk
            await UpdateStatusAsync(context, operation, VMOperationStatus.CreatingDisk, 50, "Creating VM disk...");
            await CreateVMDiskAsync(client, operation, imagePath, diskPath);

            // Check for cancellation
            await context.Entry(operation).ReloadAsync(ct);
            if (operation.Status == VMOperationStatus.Cancelled) return;

            // Stage 4: Define VM in libvirt
            await UpdateStatusAsync(context, operation, VMOperationStatus.DefiningVM, 70, "Defining VM in libvirt...");
            await DefineVMAsync(client, operation, diskPath, cloudInitIsoPath);

            // Check for cancellation
            await context.Entry(operation).ReloadAsync(ct);
            if (operation.Status == VMOperationStatus.Cancelled) return;

            // Stage 5: Start VM
            await UpdateStatusAsync(context, operation, VMOperationStatus.StartingVM, 80, "Starting VM...");
            await StartVMAsync(client, operation.VMName);

            // Stage 6: Wait for boot and get IP
            await UpdateStatusAsync(context, operation, VMOperationStatus.WaitingForBoot, 90, "Waiting for VM to boot and get IP...");
            var ipAddress = await WaitForVMBootAsync(client, operation.VMName, ct);

            // Stage 7: Complete
            operation.IpAddress = ipAddress;
            operation.SshConnectionString = $"ssh {operation.Username}@{ipAddress}";
            operation.Status = VMOperationStatus.Ready;
            operation.CurrentStage = "VM is ready!";
            operation.ProgressPercent = 100;
            operation.CompletedAt = DateTime.UtcNow;
            operation.UpdatedAt = DateTime.UtcNow;

            // Create ManagedServer entry for the new VM
            var vmServer = new ManagedServer
            {
                Name = operation.VMName,
                HostAddress = ipAddress,
                SshPort = 22,
                Username = operation.Username,
                EncryptedPassword = operation.EncryptedPassword,
                Type = ServerType.VirtualMachine,
                ParentServerId = operation.HostServerId,
                Group = operation.HostServer.Group,
                Status = ServerStatus.Online
            };

            context.ManagedServers.Add(vmServer);
            await context.SaveChangesAsync(ct);

            operation.CreatedServerId = vmServer.Id;
            await context.SaveChangesAsync(ct);

            await NotifyStatusUpdateAsync(operation);
            _logger.LogInformation("Successfully created VM {VMName} with IP {IP}", operation.VMName, ipAddress);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "VM creation failed for operation {OperationId}", operationId);
            operation.Status = VMOperationStatus.Failed;
            operation.ErrorMessage = ex.Message;
            operation.CurrentStage = "VM creation failed";
            operation.CompletedAt = DateTime.UtcNow;
            operation.UpdatedAt = DateTime.UtcNow;
            await context.SaveChangesAsync(ct);
            await NotifyStatusUpdateAsync(operation);
        }
        finally
        {
            client?.Disconnect();
            client?.Dispose();
        }
    }

    private async Task<string> EnsureImageDownloadedAsync(
        ServicesDashboardContext context,
        SshClient client,
        VmOsType osType,
        CancellationToken ct)
    {
        var config = CloudImageDefaults.ImageConfigs[osType];
        var imagePath = $"{CloudImagesPath}/{config.FileName}";

        // Create cloud-images directory if it doesn't exist
        await ExecuteCommandAsync(client, $"mkdir -p {CloudImagesPath}");

        // Check if image already exists
        var checkResult = await ExecuteCommandAsync(client, $"test -f {imagePath} && echo 'EXISTS' || echo 'NOT_FOUND'");

        if (checkResult.Contains("EXISTS"))
        {
            _logger.LogInformation("Cloud image {FileName} already exists", config.FileName);

            // Update database record
            var cloudImage = await context.CloudImages.FirstOrDefaultAsync(i => i.OsType == osType, ct);
            if (cloudImage != null)
            {
                cloudImage.IsDownloaded = true;
                cloudImage.LastCheckedAt = DateTime.UtcNow;
                await context.SaveChangesAsync(ct);
            }

            return imagePath;
        }

        _logger.LogInformation("Downloading cloud image {FileName} from {Url}", config.FileName, config.DownloadUrl);

        // Download the image using wget
        var downloadResult = await ExecuteCommandAsync(client,
            $"wget -q --show-progress -O {imagePath} '{config.DownloadUrl}' 2>&1 || echo 'DOWNLOAD_FAILED'");

        if (downloadResult.Contains("DOWNLOAD_FAILED"))
        {
            throw new Exception($"Failed to download cloud image: {downloadResult}");
        }

        // Verify download
        var verifyResult = await ExecuteCommandAsync(client, $"test -f {imagePath} && echo 'SUCCESS' || echo 'FAILED'");
        if (!verifyResult.Contains("SUCCESS"))
        {
            throw new Exception("Cloud image download verification failed");
        }

        // Update database record
        var image = await context.CloudImages.FirstOrDefaultAsync(i => i.OsType == osType, ct);
        if (image != null)
        {
            image.IsDownloaded = true;
            image.LastDownloadedAt = DateTime.UtcNow;
            await context.SaveChangesAsync(ct);
        }

        _logger.LogInformation("Successfully downloaded cloud image {FileName}", config.FileName);
        return imagePath;
    }

    private async Task PrepareCloudInitAsync(SshClient client, VMOperation operation, string vmDir, string isoPath)
    {
        var cloudInitDir = $"{vmDir}/cloud-init";
        var password = DecryptPassword(operation.EncryptedPassword ?? "");

        // Create directories
        await ExecuteCommandAsync(client, $"mkdir -p {cloudInitDir}");

        // Generate cloud-init user-data
        var userData = $@"#cloud-config
hostname: {operation.VMName}
fqdn: {operation.VMName}.local
manage_etc_hosts: true

users:
  - name: {operation.Username}
    groups: sudo
    shell: /bin/bash
    sudo: ['ALL=(ALL) NOPASSWD:ALL']
    lock_passwd: false
    plain_text_passwd: {password}

ssh_pwauth: true
chpasswd:
  expire: false

package_update: true
package_upgrade: false

packages:
  - qemu-guest-agent
  - curl
  - wget
  - vim
  - htop

runcmd:
  - systemctl enable qemu-guest-agent
  - systemctl start qemu-guest-agent
  - echo 'VM provisioned by Services Dashboard' > /etc/motd

final_message: 'VM is ready after $UPTIME seconds'
";

        var metaData = $@"instance-id: {operation.VMName}
local-hostname: {operation.VMName}
";

        // Write user-data file
        var userDataEscaped = userData.Replace("'", "'\\''");
        await ExecuteCommandAsync(client, $"cat > {cloudInitDir}/user-data << 'CLOUDINIT_EOF'\n{userData}\nCLOUDINIT_EOF");

        // Write meta-data file
        await ExecuteCommandAsync(client, $"cat > {cloudInitDir}/meta-data << 'CLOUDINIT_EOF'\n{metaData}\nCLOUDINIT_EOF");

        // Create cloud-init ISO
        var isoResult = await ExecuteCommandAsync(client,
            $"genisoimage -output {isoPath} -volid cidata -joliet -rock {cloudInitDir}/user-data {cloudInitDir}/meta-data 2>&1 || " +
            $"mkisofs -output {isoPath} -volid cidata -joliet -rock {cloudInitDir}/user-data {cloudInitDir}/meta-data 2>&1");

        // Verify ISO was created
        var verifyResult = await ExecuteCommandAsync(client, $"test -f {isoPath} && echo 'SUCCESS' || echo 'FAILED'");
        if (!verifyResult.Contains("SUCCESS"))
        {
            throw new Exception($"Failed to create cloud-init ISO: {isoResult}");
        }

        _logger.LogInformation("Created cloud-init ISO at {Path}", isoPath);
    }

    private async Task CreateVMDiskAsync(SshClient client, VMOperation operation, string baseImagePath, string diskPath)
    {
        var diskDir = Path.GetDirectoryName(diskPath)!;

        // Create VM directory
        await ExecuteCommandAsync(client, $"mkdir -p {diskDir}");

        // Create a new disk based on the cloud image
        var createResult = await ExecuteCommandAsync(client,
            $"qemu-img create -f qcow2 -F qcow2 -b {baseImagePath} {diskPath} {operation.DiskSizeGb}G 2>&1");

        // Verify disk was created
        var verifyResult = await ExecuteCommandAsync(client, $"test -f {diskPath} && echo 'SUCCESS' || echo 'FAILED'");
        if (!verifyResult.Contains("SUCCESS"))
        {
            throw new Exception($"Failed to create VM disk: {createResult}");
        }

        _logger.LogInformation("Created VM disk at {Path} with size {Size}GB", diskPath, operation.DiskSizeGb);
    }

    private async Task DefineVMAsync(SshClient client, VMOperation operation, string diskPath, string cloudInitIsoPath)
    {
        // Detect available network bridge
        var bridgeResult = await ExecuteCommandAsync(client, "virsh net-list --name | head -1");
        var networkName = string.IsNullOrWhiteSpace(bridgeResult) ? "default" : bridgeResult.Trim();

        // Try to detect a physical bridge
        var brResult = await ExecuteCommandAsync(client, "ip link show type bridge | grep -oP '(?<=: )[^:]+(?=:)' | head -1");
        var bridgeName = string.IsNullOrWhiteSpace(brResult) ? "br0" : brResult.Trim();

        // Generate libvirt XML
        var vmXml = GenerateLibvirtXml(operation, diskPath, cloudInitIsoPath, bridgeName, networkName);

        var xmlPath = $"/tmp/{operation.VMName}.xml";

        // Write XML file
        await ExecuteCommandAsync(client, $"cat > {xmlPath} << 'LIBVIRT_EOF'\n{vmXml}\nLIBVIRT_EOF");

        // Define the VM
        var defineResult = await ExecuteCommandAsync(client, $"virsh define {xmlPath} 2>&1");

        if (defineResult.Contains("error") && !defineResult.Contains("already exists"))
        {
            throw new Exception($"Failed to define VM: {defineResult}");
        }

        _logger.LogInformation("Defined VM {VMName} in libvirt", operation.VMName);
    }

    private string GenerateLibvirtXml(VMOperation operation, string diskPath, string cloudInitIsoPath, string bridgeName, string networkName)
    {
        return $@"<domain type='kvm'>
  <name>{operation.VMName}</name>
  <memory unit='MiB'>{operation.RamMb}</memory>
  <vcpu placement='static'>{operation.VCpus}</vcpu>
  <os>
    <type arch='x86_64' machine='q35'>hvm</type>
    <boot dev='hd'/>
  </os>
  <features>
    <acpi/>
    <apic/>
  </features>
  <cpu mode='host-passthrough'/>
  <clock offset='utc'>
    <timer name='rtc' tickpolicy='catchup'/>
    <timer name='pit' tickpolicy='delay'/>
    <timer name='hpet' present='no'/>
  </clock>
  <on_poweroff>destroy</on_poweroff>
  <on_reboot>restart</on_reboot>
  <on_crash>restart</on_crash>
  <devices>
    <emulator>/usr/bin/qemu-system-x86_64</emulator>
    <disk type='file' device='disk'>
      <driver name='qemu' type='qcow2' cache='writeback'/>
      <source file='{diskPath}'/>
      <target dev='vda' bus='virtio'/>
    </disk>
    <disk type='file' device='cdrom'>
      <driver name='qemu' type='raw'/>
      <source file='{cloudInitIsoPath}'/>
      <target dev='sda' bus='sata'/>
      <readonly/>
    </disk>
    <interface type='bridge'>
      <source bridge='{bridgeName}'/>
      <model type='virtio'/>
    </interface>
    <channel type='unix'>
      <target type='virtio' name='org.qemu.guest_agent.0'/>
    </channel>
    <console type='pty'>
      <target type='serial' port='0'/>
    </console>
    <graphics type='vnc' port='-1' autoport='yes' listen='0.0.0.0'>
      <listen type='address' address='0.0.0.0'/>
    </graphics>
    <video>
      <model type='qxl' ram='65536' vram='65536' vgamem='16384' heads='1'/>
    </video>
    <memballoon model='virtio'/>
  </devices>
</domain>";
    }

    private async Task StartVMAsync(SshClient client, string vmName)
    {
        var startResult = await ExecuteCommandAsync(client, $"virsh start {vmName} 2>&1");

        if (startResult.Contains("error") && !startResult.Contains("already active"))
        {
            throw new Exception($"Failed to start VM: {startResult}");
        }

        _logger.LogInformation("Started VM {VMName}", vmName);
    }

    private async Task<string> WaitForVMBootAsync(SshClient client, string vmName, CancellationToken ct)
    {
        var maxWaitTime = TimeSpan.FromMinutes(5);
        var pollInterval = TimeSpan.FromSeconds(5);
        var startTime = DateTime.UtcNow;

        while (DateTime.UtcNow - startTime < maxWaitTime)
        {
            ct.ThrowIfCancellationRequested();

            // Try to get IP from virsh domifaddr
            var ipResult = await ExecuteCommandAsync(client, $"virsh domifaddr {vmName} --source agent 2>/dev/null | grep -oE '([0-9]{{1,3}}\\.){{3}}[0-9]{{1,3}}' | head -1");

            if (!string.IsNullOrWhiteSpace(ipResult) && !ipResult.StartsWith("127."))
            {
                _logger.LogInformation("VM {VMName} got IP address: {IP}", vmName, ipResult.Trim());
                return ipResult.Trim();
            }

            // Fallback: try domifaddr without agent
            ipResult = await ExecuteCommandAsync(client, $"virsh domifaddr {vmName} 2>/dev/null | grep -oE '([0-9]{{1,3}}\\.){{3}}[0-9]{{1,3}}' | head -1");

            if (!string.IsNullOrWhiteSpace(ipResult) && !ipResult.StartsWith("127."))
            {
                _logger.LogInformation("VM {VMName} got IP address (via arp): {IP}", vmName, ipResult.Trim());
                return ipResult.Trim();
            }

            await Task.Delay(pollInterval, ct);
        }

        // If we couldn't get the IP, return a placeholder
        _logger.LogWarning("Could not determine IP address for VM {VMName} within timeout", vmName);
        return "pending";
    }

    private async Task UpdateStatusAsync(
        ServicesDashboardContext context,
        VMOperation operation,
        VMOperationStatus status,
        int progress,
        string stage)
    {
        operation.Status = status;
        operation.ProgressPercent = progress;
        operation.CurrentStage = stage;
        operation.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
        await NotifyStatusUpdateAsync(operation);
    }

    private async Task NotifyStatusUpdateAsync(VMOperation operation)
    {
        await _hubContext.Clients.All.ReceiveVMOperationUpdate(
            operation.OperationId.ToString(),
            operation.Status.ToString(),
            operation.ProgressPercent,
            operation.CurrentStage ?? "",
            operation.IpAddress,
            operation.SshConnectionString,
            operation.ErrorMessage
        );
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

    private async Task<string> ExecuteCommandAsync(SshClient client, string commandText)
    {
        return await Task.Run(() =>
        {
            using var command = client.CreateCommand(commandText);
            command.CommandTimeout = TimeSpan.FromMinutes(10);
            var result = command.Execute();
            return result?.Trim() ?? "";
        });
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
