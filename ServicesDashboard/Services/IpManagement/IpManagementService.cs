using System.Net;
using System.Net.NetworkInformation;
using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;
using ServicesDashboard.Models;

namespace ServicesDashboard.Services.IpManagement;

public interface IIpManagementService
{
    // Subnet Management
    Task<Subnet> CreateSubnetAsync(Subnet subnet);
    Task<Subnet?> GetSubnetAsync(int id);
    Task<IEnumerable<Subnet>> GetAllSubnetsAsync();
    Task<Subnet> UpdateSubnetAsync(Subnet subnet);
    Task DeleteSubnetAsync(int id);
    Task<Subnet?> FindSubnetByNetworkAsync(string network);

    // Device Management
    Task<NetworkDevice> CreateOrUpdateDeviceAsync(NetworkDevice device);
    Task<NetworkDevice?> GetDeviceAsync(int id);
    Task<NetworkDevice?> GetDeviceByIpAsync(string ipAddress);
    Task<IEnumerable<NetworkDevice>> GetAllDevicesAsync(int? subnetId = null);
    Task<IEnumerable<NetworkDevice>> GetDevicesBySubnetAsync(int subnetId);
    Task DeleteDeviceAsync(int id);
    Task<NetworkDevice?> FindDeviceByMacAsync(string macAddress);

    // IP Reservation Management
    Task<IpReservation> CreateReservationAsync(IpReservation reservation);
    Task<IpReservation?> GetReservationAsync(int id);
    Task<IEnumerable<IpReservation>> GetAllReservationsAsync(int? subnetId = null);
    Task<IpReservation> UpdateReservationAsync(IpReservation reservation);
    Task DeleteReservationAsync(int id);

    // IP Analysis
    Task<string?> FindNextAvailableIpAsync(int subnetId, bool avoidDhcpRange = true);
    Task<IEnumerable<string>> GetAvailableIpsInSubnetAsync(int subnetId, bool avoidDhcpRange = true);
    Task<IEnumerable<NetworkDevice>> DetectIpConflictsAsync(int? subnetId = null);
    Task<SubnetSummary> GetSubnetSummaryAsync(int subnetId);
    Task<bool> IsIpAvailableAsync(string ipAddress, int? subnetId = null);

    // Device History
    Task AddDeviceHistoryAsync(int deviceId, DeviceHistoryEventType eventType, string? details = null);
    Task<IEnumerable<DeviceHistory>> GetDeviceHistoryAsync(int deviceId, int limit = 50);

    // Utility Methods
    Task<string?> LookupMacVendorAsync(string macAddress);
    Task UpdateDeviceFromNetworkScanAsync(string ipAddress, string? hostname, string? macAddress, int[]? openPorts);
}

public class IpManagementService : IIpManagementService
{
    private readonly ServicesDashboardContext _context;
    private readonly ILogger<IpManagementService> _logger;

    public IpManagementService(
        ServicesDashboardContext context,
        ILogger<IpManagementService> logger)
    {
        _context = context;
        _logger = logger;
    }

    #region Subnet Management

    public async Task<Subnet> CreateSubnetAsync(Subnet subnet)
    {
        subnet.CreatedAt = DateTime.UtcNow;
        subnet.UpdatedAt = DateTime.UtcNow;

        _context.Subnets.Add(subnet);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created subnet {Network}", subnet.Network);
        return subnet;
    }

    public async Task<Subnet?> GetSubnetAsync(int id)
    {
        return await _context.Subnets
            .Include(s => s.Devices)
            .Include(s => s.Reservations)
            .FirstOrDefaultAsync(s => s.Id == id);
    }

    public async Task<IEnumerable<Subnet>> GetAllSubnetsAsync()
    {
        return await _context.Subnets
            .Include(s => s.Devices)
            .Include(s => s.Reservations)
            .OrderBy(s => s.Network)
            .ToListAsync();
    }

    public async Task<Subnet> UpdateSubnetAsync(Subnet subnet)
    {
        subnet.UpdatedAt = DateTime.UtcNow;
        _context.Subnets.Update(subnet);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated subnet {Network}", subnet.Network);
        return subnet;
    }

    public async Task DeleteSubnetAsync(int id)
    {
        var subnet = await _context.Subnets.FindAsync(id);
        if (subnet != null)
        {
            _context.Subnets.Remove(subnet);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Deleted subnet {Network}", subnet.Network);
        }
    }

    public async Task<Subnet?> FindSubnetByNetworkAsync(string network)
    {
        return await _context.Subnets
            .FirstOrDefaultAsync(s => s.Network == network);
    }

    #endregion

    #region Device Management

    public async Task<NetworkDevice> CreateOrUpdateDeviceAsync(NetworkDevice device)
    {
        // Check if device exists by IP or MAC
        NetworkDevice? existing = null;

        if (!string.IsNullOrEmpty(device.MacAddress))
        {
            existing = await FindDeviceByMacAsync(device.MacAddress);
        }

        if (existing == null)
        {
            existing = await GetDeviceByIpAsync(device.IpAddress);
        }

        if (existing != null)
        {
            // Update existing device
            var hasChanges = false;

            if (existing.IpAddress != device.IpAddress)
            {
                await AddDeviceHistoryAsync(existing.Id, DeviceHistoryEventType.IpChange,
                    $"IP changed from {existing.IpAddress} to {device.IpAddress}");
                existing.IpAddress = device.IpAddress;
                hasChanges = true;
            }

            if (!string.IsNullOrEmpty(device.MacAddress) && existing.MacAddress != device.MacAddress)
            {
                await AddDeviceHistoryAsync(existing.Id, DeviceHistoryEventType.MacChange,
                    $"MAC changed from {existing.MacAddress} to {device.MacAddress}");
                existing.MacAddress = device.MacAddress;
                hasChanges = true;
            }

            if (!string.IsNullOrEmpty(device.Hostname) && existing.Hostname != device.Hostname)
            {
                await AddDeviceHistoryAsync(existing.Id, DeviceHistoryEventType.HostnameChange,
                    $"Hostname changed from {existing.Hostname} to {device.Hostname}");
                existing.Hostname = device.Hostname;
                hasChanges = true;
            }

            if (existing.Status != device.Status)
            {
                await AddDeviceHistoryAsync(existing.Id, DeviceHistoryEventType.StatusChange,
                    $"Status changed from {existing.Status} to {device.Status}");
                existing.Status = device.Status;
                hasChanges = true;
            }

            existing.LastSeen = DateTime.UtcNow;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.LastResponseTime = device.LastResponseTime;
            existing.OpenPorts = device.OpenPorts;
            existing.OperatingSystem = device.OperatingSystem ?? existing.OperatingSystem;
            existing.DeviceType = device.DeviceType != DeviceType.Unknown ? device.DeviceType : existing.DeviceType;

            if (hasChanges)
            {
                await AddDeviceHistoryAsync(existing.Id, DeviceHistoryEventType.Updated, "Device information updated");
            }

            _context.NetworkDevices.Update(existing);
            await _context.SaveChangesAsync();
            return existing;
        }
        else
        {
            // Create new device
            device.FirstSeen = DateTime.UtcNow;
            device.LastSeen = DateTime.UtcNow;
            device.CreatedAt = DateTime.UtcNow;
            device.UpdatedAt = DateTime.UtcNow;

            // Lookup vendor from MAC address
            if (!string.IsNullOrEmpty(device.MacAddress))
            {
                device.Vendor = await LookupMacVendorAsync(device.MacAddress);
            }

            _context.NetworkDevices.Add(device);
            await _context.SaveChangesAsync();

            await AddDeviceHistoryAsync(device.Id, DeviceHistoryEventType.FirstSeen, "Device first discovered");

            _logger.LogInformation("Created new network device {IpAddress} ({MacAddress})",
                device.IpAddress, device.MacAddress);

            return device;
        }
    }

    public async Task<NetworkDevice?> GetDeviceAsync(int id)
    {
        return await _context.NetworkDevices
            .Include(d => d.Subnet)
            .Include(d => d.ManagedServer)
            .FirstOrDefaultAsync(d => d.Id == id);
    }

    public async Task<NetworkDevice?> GetDeviceByIpAsync(string ipAddress)
    {
        return await _context.NetworkDevices
            .Include(d => d.Subnet)
            .FirstOrDefaultAsync(d => d.IpAddress == ipAddress);
    }

    public async Task<IEnumerable<NetworkDevice>> GetAllDevicesAsync(int? subnetId = null)
    {
        var query = _context.NetworkDevices
            .Include(d => d.Subnet)
            .AsQueryable();

        if (subnetId.HasValue)
        {
            query = query.Where(d => d.SubnetId == subnetId.Value);
        }

        return await query
            .OrderBy(d => d.IpAddress)
            .ToListAsync();
    }

    public async Task<IEnumerable<NetworkDevice>> GetDevicesBySubnetAsync(int subnetId)
    {
        return await _context.NetworkDevices
            .Where(d => d.SubnetId == subnetId)
            .OrderBy(d => d.IpAddress)
            .ToListAsync();
    }

    public async Task DeleteDeviceAsync(int id)
    {
        var device = await _context.NetworkDevices.FindAsync(id);
        if (device != null)
        {
            _context.NetworkDevices.Remove(device);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Deleted network device {IpAddress}", device.IpAddress);
        }
    }

    public async Task<NetworkDevice?> FindDeviceByMacAsync(string macAddress)
    {
        return await _context.NetworkDevices
            .FirstOrDefaultAsync(d => d.MacAddress == macAddress);
    }

    #endregion

    #region IP Reservation Management

    public async Task<IpReservation> CreateReservationAsync(IpReservation reservation)
    {
        reservation.CreatedAt = DateTime.UtcNow;
        reservation.UpdatedAt = DateTime.UtcNow;

        _context.IpReservations.Add(reservation);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created IP reservation for {IpAddress}", reservation.IpAddress);
        return reservation;
    }

    public async Task<IpReservation?> GetReservationAsync(int id)
    {
        return await _context.IpReservations
            .Include(r => r.Subnet)
            .Include(r => r.NetworkDevice)
            .FirstOrDefaultAsync(r => r.Id == id);
    }

    public async Task<IEnumerable<IpReservation>> GetAllReservationsAsync(int? subnetId = null)
    {
        var query = _context.IpReservations
            .Include(r => r.Subnet)
            .Include(r => r.NetworkDevice)
            .AsQueryable();

        if (subnetId.HasValue)
        {
            query = query.Where(r => r.SubnetId == subnetId.Value);
        }

        return await query
            .OrderBy(r => r.IpAddress)
            .ToListAsync();
    }

    public async Task<IpReservation> UpdateReservationAsync(IpReservation reservation)
    {
        reservation.UpdatedAt = DateTime.UtcNow;
        _context.IpReservations.Update(reservation);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated IP reservation for {IpAddress}", reservation.IpAddress);
        return reservation;
    }

    public async Task DeleteReservationAsync(int id)
    {
        var reservation = await _context.IpReservations.FindAsync(id);
        if (reservation != null)
        {
            _context.IpReservations.Remove(reservation);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Deleted IP reservation for {IpAddress}", reservation.IpAddress);
        }
    }

    #endregion

    #region IP Analysis

    public async Task<string?> FindNextAvailableIpAsync(int subnetId, bool avoidDhcpRange = true)
    {
        var availableIps = await GetAvailableIpsInSubnetAsync(subnetId, avoidDhcpRange);
        return availableIps.FirstOrDefault();
    }

    public async Task<IEnumerable<string>> GetAvailableIpsInSubnetAsync(int subnetId, bool avoidDhcpRange = true)
    {
        var subnet = await GetSubnetAsync(subnetId);
        if (subnet == null)
        {
            return Enumerable.Empty<string>();
        }

        var allIps = ParseNetworkCidr(subnet.Network);
        var usedIps = new HashSet<string>();

        // Add gateway
        usedIps.Add(subnet.Gateway);

        // Add devices
        var devices = await GetDevicesBySubnetAsync(subnetId);
        foreach (var device in devices)
        {
            usedIps.Add(device.IpAddress);
        }

        // Add reservations
        var reservations = await _context.IpReservations
            .Where(r => r.SubnetId == subnetId && r.IsActive)
            .ToListAsync();
        foreach (var reservation in reservations)
        {
            usedIps.Add(reservation.IpAddress);
        }

        // Build DHCP range if avoiding it
        var dhcpRange = new HashSet<string>();
        if (avoidDhcpRange && !string.IsNullOrEmpty(subnet.DhcpStart) && !string.IsNullOrEmpty(subnet.DhcpEnd))
        {
            dhcpRange = GetIpRange(subnet.DhcpStart, subnet.DhcpEnd).ToHashSet();
        }

        var availableIps = allIps
            .Where(ip => !usedIps.Contains(ip) && !dhcpRange.Contains(ip))
            .ToList();

        return availableIps;
    }

    public async Task<IEnumerable<NetworkDevice>> DetectIpConflictsAsync(int? subnetId = null)
    {
        var query = _context.NetworkDevices.AsQueryable();

        if (subnetId.HasValue)
        {
            query = query.Where(d => d.SubnetId == subnetId.Value);
        }

        var devices = await query.ToListAsync();

        // Group by IP address and find duplicates
        var conflicts = devices
            .GroupBy(d => d.IpAddress)
            .Where(g => g.Count() > 1)
            .SelectMany(g => g)
            .ToList();

        return conflicts;
    }

    public async Task<SubnetSummary> GetSubnetSummaryAsync(int subnetId)
    {
        var subnet = await GetSubnetAsync(subnetId);
        if (subnet == null)
        {
            throw new ArgumentException($"Subnet {subnetId} not found");
        }

        var allIps = ParseNetworkCidr(subnet.Network);
        var devices = await GetDevicesBySubnetAsync(subnetId);
        var reservations = await _context.IpReservations
            .Where(r => r.SubnetId == subnetId && r.IsActive)
            .ToListAsync();

        var onlineDevices = devices.Count(d => d.Status == DeviceStatus.Online);
        var offlineDevices = devices.Count(d => d.Status == DeviceStatus.Offline);
        var usedIps = new HashSet<string>();

        usedIps.Add(subnet.Gateway);
        foreach (var device in devices) usedIps.Add(device.IpAddress);
        foreach (var reservation in reservations) usedIps.Add(reservation.IpAddress);

        return new SubnetSummary
        {
            SubnetId = subnetId,
            Network = subnet.Network,
            TotalIps = allIps.Count,
            UsedIps = usedIps.Count,
            AvailableIps = allIps.Count - usedIps.Count,
            OnlineDevices = onlineDevices,
            OfflineDevices = offlineDevices,
            ReservedIps = reservations.Count,
            DhcpRangeSize = CalculateDhcpRangeSize(subnet.DhcpStart, subnet.DhcpEnd)
        };
    }

    public async Task<bool> IsIpAvailableAsync(string ipAddress, int? subnetId = null)
    {
        // Check if IP is used by a device
        var deviceExists = await _context.NetworkDevices
            .AnyAsync(d => d.IpAddress == ipAddress && (!subnetId.HasValue || d.SubnetId == subnetId.Value));

        if (deviceExists) return false;

        // Check if IP is reserved
        var reservationExists = await _context.IpReservations
            .AnyAsync(r => r.IpAddress == ipAddress && r.IsActive && (!subnetId.HasValue || r.SubnetId == subnetId.Value));

        if (reservationExists) return false;

        return true;
    }

    #endregion

    #region Device History

    public async Task AddDeviceHistoryAsync(int deviceId, DeviceHistoryEventType eventType, string? details = null)
    {
        var device = await _context.NetworkDevices.FindAsync(deviceId);
        if (device == null) return;

        var history = new DeviceHistory
        {
            NetworkDeviceId = deviceId,
            EventType = eventType,
            EventTime = DateTime.UtcNow,
            IpAddress = device.IpAddress,
            MacAddress = device.MacAddress,
            Hostname = device.Hostname,
            Details = details
        };

        _context.DeviceHistories.Add(history);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<DeviceHistory>> GetDeviceHistoryAsync(int deviceId, int limit = 50)
    {
        return await _context.DeviceHistories
            .Where(h => h.NetworkDeviceId == deviceId)
            .OrderByDescending(h => h.EventTime)
            .Take(limit)
            .ToListAsync();
    }

    #endregion

    #region Utility Methods

    public async Task<string?> LookupMacVendorAsync(string macAddress)
    {
        // TODO: Implement MAC vendor lookup using OUI database
        // For now, return null - can be enhanced later with a vendor lookup service
        await Task.CompletedTask;
        return null;
    }

    public async Task UpdateDeviceFromNetworkScanAsync(string ipAddress, string? hostname, string? macAddress, int[]? openPorts)
    {
        var device = new NetworkDevice
        {
            IpAddress = ipAddress,
            Hostname = hostname,
            MacAddress = macAddress,
            OpenPorts = openPorts != null ? System.Text.Json.JsonSerializer.Serialize(openPorts) : null,
            Status = DeviceStatus.Online,
            Source = DiscoverySource.NetworkScan,
            LastResponseTime = 0,
            DeviceType = DeviceType.Unknown
        };

        await CreateOrUpdateDeviceAsync(device);
    }

    #endregion

    #region Private Helper Methods

    private List<string> ParseNetworkCidr(string cidr)
    {
        var ips = new List<string>();

        var parts = cidr.Split('/');
        if (parts.Length != 2 || !IPAddress.TryParse(parts[0], out var baseIp) || !int.TryParse(parts[1], out var prefixLength))
        {
            return ips;
        }

        var ipBytes = baseIp.GetAddressBytes();
        if (ipBytes.Length != 4) return ips; // Only IPv4 for now

        var hostBits = 32 - prefixLength;
        var hostCount = (int)Math.Pow(2, hostBits);

        var baseInt = BitConverter.ToUInt32(ipBytes.Reverse().ToArray(), 0);

        // Skip network address (first) and broadcast address (last)
        for (uint i = 1; i < hostCount - 1; i++)
        {
            var hostInt = baseInt + i;
            var hostBytes = BitConverter.GetBytes(hostInt).Reverse().ToArray();
            var hostIp = new IPAddress(hostBytes);
            ips.Add(hostIp.ToString());
        }

        return ips;
    }

    private IEnumerable<string> GetIpRange(string startIp, string endIp)
    {
        if (!IPAddress.TryParse(startIp, out var start) || !IPAddress.TryParse(endIp, out var end))
        {
            return Enumerable.Empty<string>();
        }

        var startBytes = start.GetAddressBytes();
        var endBytes = end.GetAddressBytes();

        var startInt = BitConverter.ToUInt32(startBytes.Reverse().ToArray(), 0);
        var endInt = BitConverter.ToUInt32(endBytes.Reverse().ToArray(), 0);

        var ips = new List<string>();
        for (var i = startInt; i <= endInt; i++)
        {
            var bytes = BitConverter.GetBytes(i).Reverse().ToArray();
            ips.Add(new IPAddress(bytes).ToString());
        }

        return ips;
    }

    private int CalculateDhcpRangeSize(string? dhcpStart, string? dhcpEnd)
    {
        if (string.IsNullOrEmpty(dhcpStart) || string.IsNullOrEmpty(dhcpEnd))
        {
            return 0;
        }

        return GetIpRange(dhcpStart, dhcpEnd).Count();
    }

    #endregion
}

/// <summary>
/// Summary statistics for a subnet
/// </summary>
public class SubnetSummary
{
    public int SubnetId { get; set; }
    public string Network { get; set; } = string.Empty;
    public int TotalIps { get; set; }
    public int UsedIps { get; set; }
    public int AvailableIps { get; set; }
    public int OnlineDevices { get; set; }
    public int OfflineDevices { get; set; }
    public int ReservedIps { get; set; }
    public int DhcpRangeSize { get; set; }
    public double UsagePercentage => TotalIps > 0 ? (double)UsedIps / TotalIps * 100 : 0;
}
