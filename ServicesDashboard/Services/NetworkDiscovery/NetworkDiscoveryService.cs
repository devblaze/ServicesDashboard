using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Text;

namespace ServicesDashboard.Services.NetworkDiscovery;

public class NetworkDiscoveryService : INetworkDiscoveryService
{
    private readonly ILogger<NetworkDiscoveryService> _logger;
    private readonly HttpClient _httpClient;

    // Common service ports to scan
    private readonly Dictionary<int, string> _commonPorts = new()
    {
        { 21, "FTP" },
        { 22, "SSH" },
        { 23, "Telnet" },
        { 25, "SMTP" },
        { 53, "DNS" },
        { 80, "HTTP" },
        { 110, "POP3" },
        { 143, "IMAP" },
        { 443, "HTTPS" },
        { 993, "IMAPS" },
        { 995, "POP3S" },
        { 1433, "SQL Server" },
        { 3306, "MySQL" },
        { 5432, "PostgreSQL" },
        { 6379, "Redis" },
        { 8080, "HTTP Alt" },
        { 8443, "HTTPS Alt" },
        { 9200, "Elasticsearch" },
        { 27017, "MongoDB" }
    };

    public NetworkDiscoveryService(ILogger<NetworkDiscoveryService> logger, HttpClient httpClient)
    {
        _logger = logger;
        _httpClient = httpClient;
        _httpClient.Timeout = TimeSpan.FromSeconds(5);
    }

    public async Task<IEnumerable<DiscoveredService>> ScanNetworkAsync(string networkRange, int[] ports, CancellationToken cancellationToken = default)
    {
        var discoveredServices = new List<DiscoveredService>();
        var hosts = GetNetworkHosts(networkRange);

        _logger.LogInformation("Starting network scan for {NetworkRange} with {HostCount} hosts", networkRange, hosts.Count());

        // Parallel scan with controlled concurrency
        var semaphore = new SemaphoreSlim(20); // Limit concurrent operations
        var tasks = hosts.Select(async host =>
        {
            await semaphore.WaitAsync(cancellationToken);
            try
            {
                var services = await ScanHostAsync(host, ports, cancellationToken);
                return services;
            }
            finally
            {
                semaphore.Release();
            }
        });

        var results = await Task.WhenAll(tasks);
        discoveredServices.AddRange(results.SelectMany(r => r));

        _logger.LogInformation("Network scan completed. Found {ServiceCount} services", discoveredServices.Count);
        return discoveredServices;
    }

    public async Task<IEnumerable<DiscoveredService>> ScanHostAsync(string hostAddress, int[] ports, CancellationToken cancellationToken = default)
    {
        var discoveredServices = new List<DiscoveredService>();

        // First, check if host is reachable
        if (!await IsHostReachableAsync(hostAddress, cancellationToken))
        {
            return discoveredServices;
        }

        var hostName = await GetHostNameAsync(hostAddress);

        // Scan each port
        var portTasks = ports.Select(async port =>
        {
            try
            {
                var service = await ScanPortAsync(hostAddress, hostName, port, cancellationToken);
                return service;
            }
            catch (Exception ex)
            {
                _logger.LogDebug("Error scanning {Host}:{Port} - {Error}", hostAddress, port, ex.Message);
                return null;
            }
        });

        var portResults = await Task.WhenAll(portTasks);
        discoveredServices.AddRange(portResults.Where(s => s != null)!);

        return discoveredServices;
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
            var connectTask = tcpClient.ConnectAsync(hostAddress, port);
            var timeoutTask = Task.Delay(3000, cancellationToken);

            var completedTask = await Task.WhenAny(connectTask, timeoutTask);
            
            if (completedTask == timeoutTask || cancellationToken.IsCancellationRequested)
            {
                return null;
            }

            if (tcpClient.Connected)
            {
                stopwatch.Stop();
                
                var service = new DiscoveredService
                {
                    HostAddress = hostAddress,
                    HostName = hostName,
                    Port = port,
                    IsReachable = true,
                    ServiceType = _commonPorts.TryGetValue(port, out var serviceType) ? serviceType : "Unknown",
                    ResponseTime = stopwatch.Elapsed
                };

                // Try to get service banner for HTTP services
                if (port == 80 || port == 8080 || port == 443 || port == 8443)
                {
                    service.Banner = await GetHttpBannerAsync(hostAddress, port, cancellationToken);
                }

                return service;
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug("Port scan failed for {Host}:{Port} - {Error}", hostAddress, port, ex.Message);
        }

        return null;
    }

    private async Task<string?> GetHttpBannerAsync(string hostAddress, int port, CancellationToken cancellationToken)
    {
        try
        {
            var scheme = port == 443 || port == 8443 ? "https" : "http";
            var url = $"{scheme}://{hostAddress}:{port}";
            
            using var response = await _httpClient.GetAsync(url, cancellationToken);
            var server = response.Headers.Server?.ToString();
            var title = await ExtractTitleFromHtmlAsync(response, cancellationToken);
            
            return !string.IsNullOrEmpty(title) ? $"{title} ({server})" : server;
        }
        catch
        {
            return null;
        }
    }

    private async Task<string?> ExtractTitleFromHtmlAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        try
        {
            if (!response.Content.Headers.ContentType?.MediaType?.Contains("text/html") == true)
                return null;

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var titleMatch = System.Text.RegularExpressions.Regex.Match(content, @"<title[^>]*>([^<]+)</title>", 
                System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            
            return titleMatch.Success ? titleMatch.Groups[1].Value.Trim() : null;
        }
        catch
        {
            return null;
        }
    }

    private IEnumerable<string> GetNetworkHosts(string networkRange)
    {
        // Parse CIDR notation (e.g., "192.168.4.0/24")
        var parts = networkRange.Split('/');
        if (parts.Length != 2 || !IPAddress.TryParse(parts[0], out var baseAddress) || !int.TryParse(parts[1], out var prefixLength))
        {
            throw new ArgumentException("Invalid network range format. Use CIDR notation (e.g., 192.168.4.0/24)");
        }

        var hosts = new List<string>();
        var baseBytes = baseAddress.GetAddressBytes();
        var hostBits = 32 - prefixLength;
        var maxHosts = (1 << hostBits) - 2; // Exclude network and broadcast addresses

        for (int i = 1; i <= maxHosts && i <= 254; i++) // Limit to reasonable range
        {
            var hostBytes = (byte[])baseBytes.Clone();
            hostBytes[3] = (byte)i;
            hosts.Add(new IPAddress(hostBytes).ToString());
        }

        return hosts;
    }
}
