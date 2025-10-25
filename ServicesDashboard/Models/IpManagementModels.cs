using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace ServicesDashboard.Models;

/// <summary>
/// Represents a subnet/network segment
/// </summary>
public class Subnet
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string Network { get; set; } = string.Empty; // e.g., "192.168.4.0/24"

    [Required]
    [MaxLength(45)]
    public string Gateway { get; set; } = string.Empty; // e.g., "192.168.4.1"

    [MaxLength(45)]
    public string? DhcpStart { get; set; } // Start of DHCP range

    [MaxLength(45)]
    public string? DhcpEnd { get; set; } // End of DHCP range

    [MaxLength(500)]
    public string? DnsServers { get; set; } // Comma-separated DNS servers

    public int? VlanId { get; set; }

    [MaxLength(200)]
    public string? Description { get; set; }

    [MaxLength(100)]
    public string? Location { get; set; }

    public bool IsMonitored { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [JsonIgnore]
    public virtual ICollection<NetworkDevice> Devices { get; set; } = new List<NetworkDevice>();

    [JsonIgnore]
    public virtual ICollection<IpReservation> Reservations { get; set; } = new List<IpReservation>();
}

/// <summary>
/// Represents a network device discovered on the network
/// </summary>
public class NetworkDevice
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(45)]
    public string IpAddress { get; set; } = string.Empty;

    [MaxLength(17)]
    public string? MacAddress { get; set; } // Format: XX:XX:XX:XX:XX:XX

    [MaxLength(255)]
    public string? Hostname { get; set; }

    [MaxLength(100)]
    public string? Vendor { get; set; } // From MAC OUI lookup

    [Required]
    public DeviceType DeviceType { get; set; } = DeviceType.Unknown;

    [Required]
    public DeviceStatus Status { get; set; } = DeviceStatus.Online;

    public DateTime FirstSeen { get; set; } = DateTime.UtcNow;

    public DateTime LastSeen { get; set; } = DateTime.UtcNow;

    public bool IsDhcpAssigned { get; set; } = true;

    public bool IsStaticIp { get; set; } = false;

    [MaxLength(500)]
    public string? Notes { get; set; } // User notes

    [MaxLength(500)]
    public string? Tags { get; set; } // Comma-separated tags

    // Link to subnet
    public int? SubnetId { get; set; }

    [ForeignKey("SubnetId")]
    [JsonIgnore]
    public virtual Subnet? Subnet { get; set; }

    // Link to managed server if this device is a managed server
    public int? ManagedServerId { get; set; }

    [ForeignKey("ManagedServerId")]
    [JsonIgnore]
    public virtual ManagedServer? ManagedServer { get; set; }

    // Open ports on this device
    [MaxLength(1000)]
    public string? OpenPorts { get; set; } // JSON array of port numbers

    // Operating system info
    [MaxLength(200)]
    public string? OperatingSystem { get; set; }

    // Last response time in milliseconds
    public double? LastResponseTime { get; set; }

    // Source of discovery
    [Required]
    public DiscoverySource Source { get; set; } = DiscoverySource.NetworkScan;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [JsonIgnore]
    public virtual ICollection<DeviceHistory> History { get; set; } = new List<DeviceHistory>();
}

/// <summary>
/// Tracks history of device connections and changes
/// </summary>
public class DeviceHistory
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int NetworkDeviceId { get; set; }

    [ForeignKey("NetworkDeviceId")]
    [JsonIgnore]
    public virtual NetworkDevice NetworkDevice { get; set; } = null!;

    [Required]
    public DeviceHistoryEventType EventType { get; set; }

    public DateTime EventTime { get; set; } = DateTime.UtcNow;

    [MaxLength(45)]
    public string? IpAddress { get; set; }

    [MaxLength(17)]
    public string? MacAddress { get; set; }

    [MaxLength(255)]
    public string? Hostname { get; set; }

    [MaxLength(500)]
    public string? Details { get; set; }
}

/// <summary>
/// Represents an IP reservation for static assignment
/// </summary>
public class IpReservation
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(45)]
    public string IpAddress { get; set; } = string.Empty;

    [MaxLength(17)]
    public string? MacAddress { get; set; } // Optional: Reserve for specific MAC

    [Required]
    [MaxLength(200)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Purpose { get; set; }

    [MaxLength(100)]
    public string? AssignedTo { get; set; } // Person or device name

    public bool IsActive { get; set; } = true;

    public DateTime? ExpiresAt { get; set; } // Optional expiration

    // Link to subnet
    public int? SubnetId { get; set; }

    [ForeignKey("SubnetId")]
    [JsonIgnore]
    public virtual Subnet? Subnet { get; set; }

    // Link to network device if assigned
    public int? NetworkDeviceId { get; set; }

    [ForeignKey("NetworkDeviceId")]
    [JsonIgnore]
    public virtual NetworkDevice? NetworkDevice { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [MaxLength(100)]
    public string? CreatedBy { get; set; }
}

/// <summary>
/// Stores Omada Controller connection information
/// </summary>
public class OmadaController
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string ApiUrl { get; set; } = string.Empty; // e.g., https://192.168.4.200

    [Required]
    [MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    [JsonIgnore] // Don't serialize password in API responses
    public string? EncryptedPassword { get; set; }

    [MaxLength(500)]
    public string? SiteId { get; set; } // Omada site ID

    public bool IsEnabled { get; set; } = true;

    public bool SyncClients { get; set; } = true; // Sync client list

    public bool SyncDhcp { get; set; } = true; // Sync DHCP leases

    public int SyncIntervalMinutes { get; set; } = 10;

    public DateTime? LastSyncTime { get; set; }

    public bool LastSyncSuccess { get; set; } = false;

    [MaxLength(500)]
    public string? LastSyncError { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

// Enums
public enum DeviceType
{
    Unknown,
    Computer,
    Server,
    Phone,
    Tablet,
    IoT,
    NetworkDevice,
    Printer,
    Camera,
    Storage,
    Gaming,
    SmartHome,
    VirtualMachine,
    Other
}

public enum DeviceStatus
{
    Online,
    Offline,
    Unknown
}

public enum DiscoverySource
{
    NetworkScan,
    OmadaController,
    ManualEntry,
    SNMP,
    ArpTable,
    Docker
}

public enum DeviceHistoryEventType
{
    FirstSeen,
    StatusChange,
    IpChange,
    MacChange,
    HostnameChange,
    Connected,
    Disconnected,
    Updated
}
