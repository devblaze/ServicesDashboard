using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;
using ServicesDashboard.Models;

namespace ServicesDashboard.Services.IpManagement;

public interface IOmadaControllerService
{
    Task<OmadaController?> GetControllerAsync(int id);
    Task<IEnumerable<OmadaController>> GetAllControllersAsync();
    Task<OmadaController> CreateControllerAsync(OmadaController controller);
    Task<OmadaController> UpdateControllerAsync(OmadaController controller);
    Task DeleteControllerAsync(int id);
    Task<bool> TestConnectionAsync(int controllerId);
    Task<OmadaSyncResult> SyncClientsAsync(int controllerId);
    Task<IEnumerable<OmadaClient>> GetConnectedClientsAsync(int controllerId);
}

public class OmadaControllerService : IOmadaControllerService
{
    private readonly ServicesDashboardContext _context;
    private readonly ILogger<OmadaControllerService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IIpManagementService _ipManagementService;

    public OmadaControllerService(
        ServicesDashboardContext context,
        ILogger<OmadaControllerService> logger,
        IHttpClientFactory httpClientFactory,
        IIpManagementService ipManagementService)
    {
        _context = context;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _ipManagementService = ipManagementService;
    }

    public async Task<OmadaController?> GetControllerAsync(int id)
    {
        return await _context.OmadaControllers.FindAsync(id);
    }

    public async Task<IEnumerable<OmadaController>> GetAllControllersAsync()
    {
        return await _context.OmadaControllers
            .OrderBy(c => c.Name)
            .ToListAsync();
    }

    public async Task<OmadaController> CreateControllerAsync(OmadaController controller)
    {
        controller.CreatedAt = DateTime.UtcNow;
        controller.UpdatedAt = DateTime.UtcNow;

        // Encrypt password (using simple base64 for now - should be improved with proper encryption)
        if (!string.IsNullOrEmpty(controller.EncryptedPassword))
        {
            controller.EncryptedPassword = Convert.ToBase64String(
                Encoding.UTF8.GetBytes(controller.EncryptedPassword));
        }

        _context.OmadaControllers.Add(controller);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created Omada controller {Name}", controller.Name);
        return controller;
    }

    public async Task<OmadaController> UpdateControllerAsync(OmadaController controller)
    {
        controller.UpdatedAt = DateTime.UtcNow;

        // Encrypt password if provided
        if (!string.IsNullOrEmpty(controller.EncryptedPassword) && !IsBase64String(controller.EncryptedPassword))
        {
            controller.EncryptedPassword = Convert.ToBase64String(
                Encoding.UTF8.GetBytes(controller.EncryptedPassword));
        }

        _context.OmadaControllers.Update(controller);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated Omada controller {Name}", controller.Name);
        return controller;
    }

    public async Task DeleteControllerAsync(int id)
    {
        var controller = await _context.OmadaControllers.FindAsync(id);
        if (controller != null)
        {
            _context.OmadaControllers.Remove(controller);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Deleted Omada controller {Name}", controller.Name);
        }
    }

    public async Task<bool> TestConnectionAsync(int controllerId)
    {
        var controller = await GetControllerAsync(controllerId);
        if (controller == null)
        {
            return false;
        }

        try
        {
            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(10);

            // Login to Omada controller
            var loginResult = await LoginAsync(httpClient, controller);
            if (!loginResult.Success)
            {
                _logger.LogWarning("Failed to connect to Omada controller {Name}: {Error}",
                    controller.Name, loginResult.ErrorMessage);
                return false;
            }

            _logger.LogInformation("Successfully connected to Omada controller {Name}", controller.Name);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing connection to Omada controller {Name}", controller.Name);
            return false;
        }
    }

    public async Task<OmadaSyncResult> SyncClientsAsync(int controllerId)
    {
        var result = new OmadaSyncResult { ControllerId = controllerId };
        var controller = await GetControllerAsync(controllerId);

        if (controller == null)
        {
            result.Success = false;
            result.ErrorMessage = "Controller not found";
            return result;
        }

        if (!controller.IsEnabled)
        {
            result.Success = false;
            result.ErrorMessage = "Controller is disabled";
            return result;
        }

        try
        {
            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);

            // Login to Omada controller
            var loginResult = await LoginAsync(httpClient, controller);
            if (!loginResult.Success)
            {
                result.Success = false;
                result.ErrorMessage = loginResult.ErrorMessage;
                controller.LastSyncSuccess = false;
                controller.LastSyncError = loginResult.ErrorMessage;
                await _context.SaveChangesAsync();
                return result;
            }

            // Get connected clients
            var clients = await GetClientsFromApiAsync(httpClient, controller, loginResult.Token);

            // Sync clients to IP management system
            foreach (var client in clients)
            {
                try
                {
                    var device = new NetworkDevice
                    {
                        IpAddress = client.Ip,
                        MacAddress = client.Mac,
                        Hostname = client.Name,
                        Status = client.Active ? DeviceStatus.Online : DeviceStatus.Offline,
                        DeviceType = DetermineDeviceType(client),
                        Source = DiscoverySource.OmadaController,
                        LastResponseTime = 0
                    };

                    await _ipManagementService.CreateOrUpdateDeviceAsync(device);
                    result.DevicesSynced++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error syncing client {Mac} from Omada", client.Mac);
                    result.Errors++;
                }
            }

            result.Success = true;
            result.SyncTime = DateTime.UtcNow;

            controller.LastSyncTime = DateTime.UtcNow;
            controller.LastSyncSuccess = true;
            controller.LastSyncError = null;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Successfully synced {Count} clients from Omada controller {Name}",
                result.DevicesSynced, controller.Name);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error syncing clients from Omada controller {Name}", controller.Name);
            result.Success = false;
            result.ErrorMessage = ex.Message;

            controller.LastSyncSuccess = false;
            controller.LastSyncError = ex.Message;
            await _context.SaveChangesAsync();
        }

        return result;
    }

    public async Task<IEnumerable<OmadaClient>> GetConnectedClientsAsync(int controllerId)
    {
        var controller = await GetControllerAsync(controllerId);
        if (controller == null)
        {
            return Enumerable.Empty<OmadaClient>();
        }

        try
        {
            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(30);

            var loginResult = await LoginAsync(httpClient, controller);
            if (!loginResult.Success)
            {
                _logger.LogWarning("Failed to login to Omada controller {Name}", controller.Name);
                return Enumerable.Empty<OmadaClient>();
            }

            var clients = await GetClientsFromApiAsync(httpClient, controller, loginResult.Token);
            return clients;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting clients from Omada controller {Name}", controller.Name);
            return Enumerable.Empty<OmadaClient>();
        }
    }

    #region Private Helper Methods

    private async Task<OmadaLoginResult> LoginAsync(HttpClient httpClient, OmadaController controller)
    {
        try
        {
            // Decrypt password
            var password = string.IsNullOrEmpty(controller.EncryptedPassword)
                ? string.Empty
                : Encoding.UTF8.GetString(Convert.FromBase64String(controller.EncryptedPassword));

            // Build login endpoint URL
            var loginUrl = $"{controller.ApiUrl.TrimEnd('/')}/api/v2/login";

            var loginData = new
            {
                username = controller.Username,
                password = password
            };

            var content = new StringContent(
                JsonSerializer.Serialize(loginData),
                Encoding.UTF8,
                "application/json");

            var response = await httpClient.PostAsync(loginUrl, content);

            if (response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<OmadaApiResponse>(responseContent);

                if (result?.ErrorCode == 0 && result.Result != null)
                {
                    var tokenElement = ((JsonElement)result.Result).GetProperty("token");
                    var token = tokenElement.GetString() ?? string.Empty;

                    return new OmadaLoginResult
                    {
                        Success = true,
                        Token = token
                    };
                }
            }

            return new OmadaLoginResult
            {
                Success = false,
                ErrorMessage = $"Login failed with status code: {response.StatusCode}"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during Omada login");
            return new OmadaLoginResult
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    private async Task<List<OmadaClient>> GetClientsFromApiAsync(HttpClient httpClient, OmadaController controller, string token)
    {
        var clients = new List<OmadaClient>();

        try
        {
            // Build clients endpoint URL
            var siteId = string.IsNullOrEmpty(controller.SiteId) ? "Default" : controller.SiteId;
            var clientsUrl = $"{controller.ApiUrl.TrimEnd('/')}/api/v2/{siteId}/clients";

            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await httpClient.GetAsync(clientsUrl);

            if (response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<OmadaApiResponse>(responseContent);

                if (result?.ErrorCode == 0 && result.Result != null)
                {
                    var dataElement = ((JsonElement)result.Result).GetProperty("data");

                    foreach (var clientElement in dataElement.EnumerateArray())
                    {
                        try
                        {
                            var client = new OmadaClient
                            {
                                Mac = clientElement.GetProperty("mac").GetString() ?? "",
                                Ip = clientElement.GetProperty("ip").GetString() ?? "",
                                Name = clientElement.TryGetProperty("name", out var nameEl)
                                    ? nameEl.GetString() ?? ""
                                    : "",
                                Active = clientElement.TryGetProperty("active", out var activeEl)
                                    && activeEl.GetBoolean(),
                                Wireless = clientElement.TryGetProperty("wireless", out var wirelessEl)
                                    && wirelessEl.GetBoolean(),
                                DeviceType = clientElement.TryGetProperty("deviceType", out var typeEl)
                                    ? typeEl.GetString() ?? "Unknown"
                                    : "Unknown"
                            };

                            clients.Add(client);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogDebug(ex, "Error parsing Omada client data");
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting clients from Omada API");
        }

        return clients;
    }

    private DeviceType DetermineDeviceType(OmadaClient client)
    {
        var deviceType = client.DeviceType?.ToLower() ?? "";

        if (deviceType.Contains("phone") || deviceType.Contains("mobile"))
            return DeviceType.Phone;
        if (deviceType.Contains("tablet"))
            return DeviceType.Tablet;
        if (deviceType.Contains("computer") || deviceType.Contains("pc") || deviceType.Contains("laptop"))
            return DeviceType.Computer;
        if (deviceType.Contains("camera"))
            return DeviceType.Camera;
        if (deviceType.Contains("printer"))
            return DeviceType.Printer;
        if (deviceType.Contains("server"))
            return DeviceType.Server;
        if (deviceType.Contains("iot") || deviceType.Contains("smart"))
            return DeviceType.IoT;

        return DeviceType.Unknown;
    }

    private bool IsBase64String(string s)
    {
        try
        {
            Convert.FromBase64String(s);
            return true;
        }
        catch
        {
            return false;
        }
    }

    #endregion
}

#region DTO Classes

public class OmadaClient
{
    public string Mac { get; set; } = string.Empty;
    public string Ip { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool Active { get; set; }
    public bool Wireless { get; set; }
    public string DeviceType { get; set; } = string.Empty;
}

public class OmadaSyncResult
{
    public int ControllerId { get; set; }
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public int DevicesSynced { get; set; }
    public int Errors { get; set; }
    public DateTime SyncTime { get; set; }
}

public class OmadaLoginResult
{
    public bool Success { get; set; }
    public string Token { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
}

public class OmadaApiResponse
{
    public int ErrorCode { get; set; }
    public string? Msg { get; set; }
    public object? Result { get; set; }
}

#endregion
