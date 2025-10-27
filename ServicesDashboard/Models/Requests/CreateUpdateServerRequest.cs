using System.ComponentModel.DataAnnotations;

namespace ServicesDashboard.Models.Requests;

public class CreateUpdateServerRequest
{
    [Required(ErrorMessage = "Server name is required")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Server name must be between 2 and 100 characters")]
    public string Name { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "Host address is required")]
    [StringLength(255, ErrorMessage = "Host address must not exceed 255 characters")]
    public string HostAddress { get; set; } = string.Empty;
    
    [Range(1, 65535, ErrorMessage = "SSH port must be between 1 and 65535")]
    public int? SshPort { get; set; } = 22;
    
    [StringLength(100, ErrorMessage = "Username must not exceed 100 characters")]
    public string? Username { get; set; }
    
    public string? Password { get; set; } // Plain text - will be encrypted by service
    
    public string? Type { get; set; }

    public string? Group { get; set; }

    public string? Tags { get; set; }

    public int? ParentServerId { get; set; }

    [StringLength(17, ErrorMessage = "MAC address must not exceed 17 characters (format: XX:XX:XX:XX:XX:XX)")]
    public string? MacAddress { get; set; }

    [Range(1, 65535, ErrorMessage = "Wake-on-LAN port must be between 1 and 65535")]
    public int WakeOnLanPort { get; set; } = 9;
}