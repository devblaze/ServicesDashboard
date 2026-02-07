using System.ComponentModel.DataAnnotations;

namespace ServicesDashboard.Models;

public class CloudImage
{
    [Key]
    public int Id { get; set; }

    [Required]
    public VmOsType OsType { get; set; }

    [Required]
    [MaxLength(255)]
    public string DisplayName { get; set; } = string.Empty;

    [Required]
    public string DownloadUrl { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string FileName { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? Checksum { get; set; }

    [MaxLength(20)]
    public string? ChecksumType { get; set; }

    public long? FileSizeBytes { get; set; }

    [MaxLength(50)]
    public string? Version { get; set; }

    public bool IsDownloaded { get; set; }

    public DateTime? LastDownloadedAt { get; set; }

    public DateTime? LastCheckedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public static class CloudImageDefaults
{
    public static readonly Dictionary<VmOsType, CloudImageConfig> ImageConfigs = new()
    {
        [VmOsType.Ubuntu2404] = new CloudImageConfig
        {
            DisplayName = "Ubuntu 24.04 LTS (Noble)",
            DownloadUrl = "https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img",
            FileName = "ubuntu-24.04-cloudimg-amd64.img",
            ChecksumUrl = "https://cloud-images.ubuntu.com/noble/current/SHA256SUMS"
        },
        [VmOsType.Ubuntu2204] = new CloudImageConfig
        {
            DisplayName = "Ubuntu 22.04 LTS (Jammy)",
            DownloadUrl = "https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img",
            FileName = "ubuntu-22.04-cloudimg-amd64.img",
            ChecksumUrl = "https://cloud-images.ubuntu.com/jammy/current/SHA256SUMS"
        },
        [VmOsType.Debian12] = new CloudImageConfig
        {
            DisplayName = "Debian 12 (Bookworm)",
            DownloadUrl = "https://cloud.debian.org/images/cloud/bookworm/latest/debian-12-generic-amd64.qcow2",
            FileName = "debian-12-generic-amd64.qcow2",
            ChecksumUrl = "https://cloud.debian.org/images/cloud/bookworm/latest/SHA512SUMS"
        },
        [VmOsType.KaliLinux] = new CloudImageConfig
        {
            DisplayName = "Kali Linux (Latest)",
            DownloadUrl = "https://kali.download/cloud-images/current/kali-linux-2024.4-cloud-genericcloud-amd64.qcow2",
            FileName = "kali-linux-cloud-amd64.qcow2",
            ChecksumUrl = null // Kali doesn't provide easy checksum file
        }
    };
}

public class CloudImageConfig
{
    public string DisplayName { get; set; } = string.Empty;
    public string DownloadUrl { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string? ChecksumUrl { get; set; }
}
