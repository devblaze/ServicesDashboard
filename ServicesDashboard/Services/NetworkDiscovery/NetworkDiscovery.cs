using System.Collections.Concurrent;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Text;
using ServicesDashboard.Services.AIServiceRecognition;

namespace ServicesDashboard.Services.NetworkDiscovery;

public class NetworkDiscovery : INetworkDiscoveryService
{
    private readonly ILogger<NetworkDiscovery> _logger;
    private readonly IAIServiceRecognitionService _aiService;

    public NetworkDiscovery(ILogger<NetworkDiscovery> logger, IAIServiceRecognitionService aiService)
    {
        _logger = logger;
        _aiService = aiService;
    }

    public async Task<IEnumerable<DiscoveredService>> ScanNetworkAsync(string networkRange, int[] ports, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting network scan for {NetworkRange}", networkRange);
        
        var hosts = ParseNetworkRange(networkRange);
        var services = new ConcurrentBag<DiscoveredService>(); // Use ConcurrentBag instead
        
        var semaphore = new SemaphoreSlim(20); // Limit concurrent scans
        var tasks = new List<Task>();

        foreach (var host in hosts)
        {
            if (cancellationToken.IsCancellationRequested) break;
            
            tasks.Add(Task.Run(async () => // Fix the Task.Run signature
            {
                await semaphore.WaitAsync(cancellationToken);
                try
                {
                    var hostServices = await ScanHostAsync(host, ports, cancellationToken);
                    foreach (var service in hostServices) // Add services individually
                    {
                        services.Add(service);
                    }
                }
                finally
                {
                    semaphore.Release();
                }
            }, cancellationToken));
        }

        await Task.WhenAll(tasks);
        
        _logger.LogInformation("Network scan completed. Found {ServiceCount} services", services.Count);
        return services.OrderBy(s => s.HostAddress).ThenBy(s => s.Port).ToList();
    }

    public async Task<IEnumerable<DiscoveredService>> ScanHostAsync(string hostAddress, int[] ports, CancellationToken cancellationToken)
    {
        var services = new List<DiscoveredService>();
        
        // First, check if host is reachable
        if (!await IsHostReachableAsync(hostAddress, cancellationToken))
        {
            _logger.LogDebug("Host {HostAddress} is not reachable", hostAddress);
            return services;
        }

        var hostName = await GetHostNameAsync(hostAddress);
        
        var portTasks = ports.Select(async port =>
        {
            try
            {
                var service = await ScanPortAsync(hostAddress, hostName, port, cancellationToken);
                return service;
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Error scanning port {Port} on {HostAddress}", port, hostAddress);
                return null;
            }
        });

        var results = await Task.WhenAll(portTasks);
        services.AddRange(results.Where(s => s != null).Cast<DiscoveredService>());

        return services;
    }

    private async Task<bool> IsHostReachableAsync(string hostAddress, CancellationToken cancellationToken)
    {
        try
        {
            using var ping = new Ping();
            var reply = await ping.SendPingAsync(hostAddress, 3000);
            return reply.Status == IPStatus.Success;
        }
        catch
        {
            return false;
        }
    }

    private async Task<string> GetHostNameAsync(string hostAddress)
    {
        try
        {
            var hostEntry = await Dns.GetHostEntryAsync(hostAddress);
            return hostEntry.HostName;
        }
        catch
        {
            return hostAddress;
        }
    }

    private async Task<DiscoveredService?> ScanPortAsync(string hostAddress, string hostName, int port, CancellationToken cancellationToken)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            using var tcpClient = new TcpClient();
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromMilliseconds(5000));
            
            await tcpClient.ConnectAsync(hostAddress, port, timeoutCts.Token);
            stopwatch.Stop();

            if (!tcpClient.Connected)
                return null;

            var service = new DiscoveredService
            {
                HostAddress = hostAddress,
                HostName = hostName,
                Port = port,
                IsReachable = true,
                ResponseTime = stopwatch.Elapsed,
                ServiceType = GetServiceType(port),
                DiscoveredAt = DateTime.UtcNow
            };

            // Try to get banner
            try
            {
                service.Banner = await GetServiceBannerAsync(tcpClient, timeoutCts.Token);
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Could not get banner for {HostAddress}:{Port}", hostAddress, port);
            }

            // For now, we'll skip AI-based service recognition since the method doesn't exist
            // You can implement this later when the AI service interface is updated

            return service;
        }
        catch (OperationCanceledException)
        {
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Port {Port} on {HostAddress} is not reachable", port, hostAddress);
            return null;
        }
    }

    private async Task<string?> GetServiceBannerAsync(TcpClient tcpClient, CancellationToken cancellationToken)
    {
        try
        {
            var stream = tcpClient.GetStream();
            var buffer = new byte[1024];
            
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromMilliseconds(3000));
            
            var bytesRead = await stream.ReadAsync(buffer, 0, buffer.Length, timeoutCts.Token);
            if (bytesRead > 0)
            {
                return Encoding.UTF8.GetString(buffer, 0, bytesRead).Trim();
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Could not read banner from service");
        }
        
        return null;
    }

    private string GetServiceType(int port)
    {
        return port switch
        {
            21 => "FTP",
            22 => "SSH",
            23 => "Telnet",
            25 => "SMTP",
            53 => "DNS",
            80 => "HTTP",
            110 => "POP3",
            143 => "IMAP",
            443 => "HTTPS",
            993 => "IMAPS",
            995 => "POP3S",
            3306 => "MySQL",
            5432 => "PostgreSQL",
            6379 => "Redis",
            27017 => "MongoDB",
            3389 => "RDP",
            5900 => "VNC",
            _ => "Unknown"
        };
    }

    private IEnumerable<string> ParseNetworkRange(string networkRange)
    {
        var hosts = new List<string>();
        
        if (networkRange.Contains('/'))
        {
            // CIDR notation
            var parts = networkRange.Split('/');
            if (parts.Length == 2 && IPAddress.TryParse(parts[0], out var baseIp) && int.TryParse(parts[1], out var prefixLength))
            {
                hosts.AddRange(GetHostsFromCidr(baseIp, prefixLength));
            }
        }
        else if (networkRange.Contains('-'))
        {
            // Range notation (e.g., 192.168.1.1-254)
            var parts = networkRange.Split('-');
            if (parts.Length == 2)
            {
                var baseParts = parts[0].Split('.');
                if (baseParts.Length == 4 && int.TryParse(baseParts[3], out var startRange) && int.TryParse(parts[1], out var endRange))
                {
                    var networkBase = string.Join(".", baseParts.Take(3));
                    for (int i = startRange; i <= endRange; i++)
                    {
                        hosts.Add($"{networkBase}.{i}");
                    }
                }
            }
        }
        else
        {
            // Single IP or hostname
            hosts.Add(networkRange);
        }
        
        return hosts;
    }

    private IEnumerable<string> GetHostsFromCidr(IPAddress baseIp, int prefixLength)
    {
        var hosts = new List<string>();
        var ipBytes = baseIp.GetAddressBytes();
        
        if (ipBytes.Length != 4) return hosts; // Only IPv4 for now
        
        var hostBits = 32 - prefixLength;
        var hostCount = (int)Math.Pow(2, hostBits) - 2; // Exclude network and broadcast addresses
        
        var baseInt = BitConverter.ToUInt32(ipBytes.Reverse().ToArray(), 0);
        
        for (uint i = 1; i <= hostCount && i < 254; i++) // Limit to reasonable range
        {
            var hostInt = baseInt + i;
            var hostBytes = BitConverter.GetBytes(hostInt).Reverse().ToArray();
            var hostIp = new IPAddress(hostBytes);
            hosts.Add(hostIp.ToString());
        }
        
        return hosts;
    }
}