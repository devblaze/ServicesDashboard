using System.Collections.Concurrent;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Text;
using ServicesDashboard.Models.Results;
using ServicesDashboard.Services.ArtificialIntelligence;

namespace ServicesDashboard.Services.NetworkDiscovery;

public interface INetworkDiscoveryService
{
    Task<IEnumerable<DiscoveredServiceResult>> ScanNetworkAsync(string networkRange, int[]? ports = null, bool fullScan = false, CancellationToken cancellationToken = default);
    Task<IEnumerable<DiscoveredServiceResult>> ScanHostAsync(string hostAddress, int[]? ports = null, bool fullScan = false, CancellationToken cancellationToken = default);
    int[] GetCommonPorts();
    int[] GetExtendedPorts();
}

public class NetworkDiscovery : INetworkDiscoveryService
{
    private readonly ILogger<NetworkDiscovery> _logger;
    private readonly IServiceRecognitionService _service;

    // Common ports for quick scanning
    private static readonly int[] CommonPorts = {
        21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445, 993, 995, 
        1723, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 9200, 27017
    };

    // Extended ports for thorough scanning
    private static readonly int[] ExtendedPorts = {
        7, 9, 13, 21, 22, 23, 25, 26, 37, 53, 79, 80, 81, 88, 106, 110, 111,
        113, 119, 135, 139, 143, 144, 179, 199, 389, 427, 443, 444, 445, 465,
        513, 514, 515, 543, 544, 548, 554, 587, 631, 646, 873, 990, 993, 995,
        1025, 1026, 1027, 1028, 1029, 1110, 1433, 1720, 1723, 1755, 1900, 2000,
        2001, 2049, 2121, 2717, 3000, 3128, 3306, 3389, 3986, 4899, 5000, 5009,
        5051, 5060, 5101, 5190, 5357, 5432, 5631, 5666, 5800, 5900, 6000, 6001,
        6646, 7000, 7070, 7937, 7938, 8000, 8002, 8008, 8010, 8080, 8443, 8888,
        9000, 9001, 9090, 9100, 9102, 9200, 9999, 10000, 32768, 49152, 49153, 49154, 49155, 49156, 49157
    };

    public NetworkDiscovery(ILogger<NetworkDiscovery> logger, IServiceRecognitionService service)
    {
        _logger = logger;
        _service = service;
    }

    public int[] GetCommonPorts() => CommonPorts;
    public int[] GetExtendedPorts() => ExtendedPorts;

    public async Task<IEnumerable<DiscoveredServiceResult>> ScanNetworkAsync(string networkRange, int[]? ports = null, bool fullScan = false, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Starting network scan for {NetworkRange} (FullScan: {FullScan})", networkRange, fullScan);
        
        var hosts = ParseNetworkRange(networkRange);
        var services = new ConcurrentBag<DiscoveredServiceResult>();
        
        var scanPorts = GetPortsToScan(ports, fullScan);
        _logger.LogInformation("Scanning {PortCount} ports per host", scanPorts.Length);
        
        var semaphore = new SemaphoreSlim(10); // Reduced concurrency for full scans
        var tasks = new List<Task>();

        foreach (var host in hosts)
        {
            if (cancellationToken.IsCancellationRequested) break;
            
            tasks.Add(Task.Run(async () =>
            {
                await semaphore.WaitAsync(cancellationToken);
                try
                {
                    var hostServices = await ScanHostAsync(host, scanPorts, fullScan, cancellationToken);
                    foreach (var service in hostServices)
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
        
        var resultList = services.OrderBy(s => s.HostAddress).ThenBy(s => s.Port).ToList();
        _logger.LogInformation("Network scan completed. Found {ServiceCount} services", resultList.Count);
        return resultList;
    }

    public async Task<IEnumerable<DiscoveredServiceResult>> ScanHostAsync(string hostAddress, int[]? ports = null, bool fullScan = false, CancellationToken cancellationToken = default)
    {
        var services = new List<DiscoveredServiceResult>();
        
        _logger.LogInformation("Starting host scan for {HostAddress} (FullScan: {FullScan})", hostAddress, fullScan);
        
        // First, check if host is reachable
        if (!await IsHostReachableAsync(hostAddress, cancellationToken))
        {
            _logger.LogDebug("Host {HostAddress} is not reachable", hostAddress);
            return services;
        }

        var hostName = await GetHostNameAsync(hostAddress);
        var scanPorts = GetPortsToScan(ports, fullScan);
        
        _logger.LogInformation("Scanning {PortCount} ports on {HostAddress}", scanPorts.Length, hostAddress);

        // Use different concurrency limits based on scan type
        var semaphore = new SemaphoreSlim(fullScan ? 100 : 50);
        var portTasks = scanPorts.Select(async port =>
        {
            await semaphore.WaitAsync(cancellationToken);
            try
            {
                return await ScanPortAsync(hostAddress, hostName, port, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Error scanning port {Port} on {HostAddress}", port, hostAddress);
                return null;
            }
            finally
            {
                semaphore.Release();
            }
        });

        var results = await Task.WhenAll(portTasks);
        services.AddRange(results.Where(s => s != null).Cast<DiscoveredServiceResult>());

        _logger.LogInformation("Host scan completed for {HostAddress}. Found {ServiceCount} open ports", 
            hostAddress, services.Count);
        
        return services;
    }

    private int[] GetPortsToScan(int[]? ports, bool fullScan)
    {
        if (ports != null && ports.Length > 0)
        {
            return ports;
        }

        if (fullScan)
        {
            // Generate full port range (1-65535) for comprehensive scanning
            return Enumerable.Range(1, 65535).ToArray();
        }

        // Use extended ports for better coverage when no ports specified
        return ExtendedPorts;
    }

    private async Task<bool> IsHostReachableAsync(string hostAddress, CancellationToken cancellationToken)
    {
        try
        {
            using var ping = new Ping();
            var reply = await ping.SendPingAsync(hostAddress, 2000);
            return reply.Status == IPStatus.Success;
        }
        catch
        {
            // If ping fails, try a quick TCP connect to common ports
            return await QuickTcpCheck(hostAddress, cancellationToken);
        }
    }

    private async Task<bool> QuickTcpCheck(string hostAddress, CancellationToken cancellationToken)
    {
        var quickCheckPorts = new[] { 80, 443, 22, 21, 25 };
        
        foreach (var port in quickCheckPorts)
        {
            try
            {
                using var tcpClient = new TcpClient();
                using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                timeoutCts.CancelAfter(TimeSpan.FromMilliseconds(1000));
                
                await tcpClient.ConnectAsync(hostAddress, port, timeoutCts.Token);
                if (tcpClient.Connected)
                {
                    return true;
                }
            }
            catch
            {
                // Continue to next port
            }
        }
        
        return false;
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

    private async Task<DiscoveredServiceResult?> ScanPortAsync(string hostAddress, string hostName, int port, CancellationToken cancellationToken)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            using var tcpClient = new TcpClient();
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            
            // Shorter timeout for full scans to avoid taking too long
            var timeout = port <= 1024 ? 3000 : 2000; // Well-known ports get more time
            timeoutCts.CancelAfter(TimeSpan.FromMilliseconds(timeout));
            
            await tcpClient.ConnectAsync(hostAddress, port, timeoutCts.Token);
            stopwatch.Stop();

            if (!tcpClient.Connected)
                return null;

            var service = new DiscoveredServiceResult
            {
                HostAddress = hostAddress,
                HostName = hostName,
                Port = port,
                IsReachable = true,
                ResponseTime = stopwatch.Elapsed,
                ServiceType = GetServiceType(port),
                DiscoveredAt = DateTime.UtcNow
            };

            // Try to get banner for identification
            try
            {
                service.Banner = await GetServiceBannerAsync(tcpClient, timeoutCts.Token);
            
                // Enhance service type detection based on banner
                if (!string.IsNullOrEmpty(service.Banner))
                {
                    service.ServiceType = EnhanceServiceTypeFromBanner(service.ServiceType, service.Banner);
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Could not get banner for {HostAddress}:{Port}", hostAddress, port);
            }

            // Use AI service recognition for better identification
            try
            {
                var recognition = await _service.RecognizeServiceAsync(
                    hostAddress, 
                    port, 
                    service.ServiceType, 
                    service.Banner,
                    cancellationToken: timeoutCts.Token
                );

                if (recognition.Confidence > 0.5)
                {
                    service.RecognizedName = recognition.RecognizedName;
                    service.SuggestedDescription = recognition.Description;
                    service.ServiceCategory = recognition.Category;
                    service.SuggestedIcon = recognition.IconName;
                    service.AiConfidence = recognition.Confidence;
                }
                
                _logger.LogInformation("AI Recognition completed: {RecognizedName} with confidence {Confidence}", 
                    recognition.RecognizedName, recognition.Confidence);
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "AI service recognition failed for {HostAddress}:{Port}", hostAddress, port);
            }
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
        timeoutCts.CancelAfter(TimeSpan.FromMilliseconds(2000));
    
        // Send a simple HTTP request for web services
        var httpRequest = "GET / HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n";
        var httpBytes = Encoding.UTF8.GetBytes(httpRequest);
        await stream.WriteAsync(httpBytes, 0, httpBytes.Length, timeoutCts.Token);
        
        var bytesRead = await stream.ReadAsync(buffer, 0, buffer.Length, timeoutCts.Token);
        if (bytesRead > 0)
        {
            // Use UTF-8 with fallback decoder to handle invalid byte sequences
            var decoder = Encoding.UTF8.GetDecoder();
            decoder.Fallback = new DecoderReplacementFallback(""); // Replace invalid bytes with empty string
            
            var charBuffer = new char[1024];
            var charCount = decoder.GetChars(buffer, 0, bytesRead, charBuffer, 0);
            var rawString = new string(charBuffer, 0, charCount);
            
            // Parse HTTP response to extract useful banner information
            var lines = rawString.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            var bannerInfo = new List<string>();
            
            foreach (var line in lines.Take(10)) // Limit to first 10 lines
            {
                if (line.StartsWith("HTTP/"))
                    bannerInfo.Add($"Status: {line}");
                else if (line.StartsWith("Server:", StringComparison.OrdinalIgnoreCase))
                    bannerInfo.Add(line);
                else if (line.StartsWith("X-Powered-By:", StringComparison.OrdinalIgnoreCase))
                    bannerInfo.Add(line);
                else if (line.StartsWith("Content-Type:", StringComparison.OrdinalIgnoreCase))
                    bannerInfo.Add(line);
            }
            
            var cleanedBanner = string.Join(" | ", bannerInfo);
            return string.IsNullOrWhiteSpace(cleanedBanner) ? "HTTP Service" : cleanedBanner;
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
            7 => "Echo",
            9 => "Discard",
            13 => "Daytime",
            21 => "FTP",
            22 => "SSH",
            23 => "Telnet",
            25 => "SMTP",
            37 => "Time",
            53 => "DNS",
            79 => "Finger",
            80 => "HTTP",
            81 => "HTTP Alt",
            88 => "Kerberos",
            110 => "POP3",
            111 => "RPC",
            113 => "Ident",
            119 => "NNTP",
            135 => "RPC Endpoint Mapper",
            139 => "NetBIOS",
            143 => "IMAP",
            179 => "BGP",
            389 => "LDAP",
            443 => "HTTPS",
            445 => "SMB",
            465 => "SMTPS",
            514 => "Syslog",
            515 => "LPD",
            587 => "SMTP (Submission)",
            631 => "IPP",
            993 => "IMAPS",
            995 => "POP3S",
            1433 => "SQL Server",
            1723 => "PPTP",
            3000 => "Node.js/Development",
            3306 => "MySQL",
            3389 => "RDP",
            5000 => "UPnP/Development",
            5432 => "PostgreSQL",
            5900 => "VNC",
            6379 => "Redis",
            8000 => "HTTP Alt",
            8080 => "HTTP Proxy",
            8443 => "HTTPS Alt",
            8888 => "HTTP Alt",
            9000 => "Development",
            9200 => "Elasticsearch",
            27017 => "MongoDB",
            _ => "Unknown"
        };
    }

    private string EnhanceServiceTypeFromBanner(string currentType, string banner)
    {
        var bannerLower = banner.ToLower();
        
        // Web servers
        if (bannerLower.Contains("nginx")) return "Nginx";
        if (bannerLower.Contains("apache")) return "Apache";
        if (bannerLower.Contains("iis")) return "IIS";
        if (bannerLower.Contains("lighttpd")) return "Lighttpd";
        
        // Database servers
        if (bannerLower.Contains("mysql")) return "MySQL";
        if (bannerLower.Contains("postgresql")) return "PostgreSQL";
        if (bannerLower.Contains("mongodb")) return "MongoDB";
        if (bannerLower.Contains("redis")) return "Redis";
        
        // SSH servers
        if (bannerLower.Contains("openssh")) return "OpenSSH";
        
        // FTP servers
        if (bannerLower.Contains("filezilla")) return "FileZilla FTP";
        if (bannerLower.Contains("proftpd")) return "ProFTPD";
        if (bannerLower.Contains("vsftpd")) return "vsftpd";
        
        // Mail servers
        if (bannerLower.Contains("postfix")) return "Postfix";
        if (bannerLower.Contains("sendmail")) return "Sendmail";
        if (bannerLower.Contains("dovecot")) return "Dovecot";
        
        // Development servers
        if (bannerLower.Contains("express")) return "Express.js";
        if (bannerLower.Contains("flask")) return "Flask";
        if (bannerLower.Contains("django")) return "Django";
        
        return currentType;
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
        
        // Limit large subnets to prevent excessive scanning
        var maxHosts = Math.Min(hostCount, 1000);
        
        var baseInt = BitConverter.ToUInt32(ipBytes.Reverse().ToArray(), 0);
        
        for (uint i = 1; i <= maxHosts; i++)
        {
            var hostInt = baseInt + i;
            var hostBytes = BitConverter.GetBytes(hostInt).Reverse().ToArray();
            var hostIp = new IPAddress(hostBytes);
            hosts.Add(hostIp.ToString());
        }
        
        return hosts;
    }
}