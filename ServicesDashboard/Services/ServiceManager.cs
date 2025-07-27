using ServicesDashboard.Models;
using ServicesDashboard.Data;
using Microsoft.EntityFrameworkCore;

namespace ServicesDashboard.Services;

public class ServiceManager : IServiceManager
{
    private readonly ServicesDashboardContext _context;
    private readonly ILogger<ServiceManager> _logger;

    public ServiceManager(ServicesDashboardContext context, ILogger<ServiceManager> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<HostedService>> GetAllServicesAsync()
    {
        try
        {
            return await _context.Services.ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving all services");
            return new List<HostedService>();
        }
    }

    public async Task<HostedService?> GetServiceByIdAsync(Guid id)
    {
        try
        {
            return await _context.Services.FindAsync(id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving service with ID {ServiceId}", id);
            return null;
        }
    }

    public async Task<HostedService> AddServiceAsync(HostedService service)
    {
        try
        {
            service.Id = Guid.NewGuid();
            service.DateAdded = DateTime.UtcNow;
            service.LastChecked = DateTime.UtcNow;

            _context.Services.Add(service);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Service {ServiceName} added with ID {ServiceId}", service.Name, service.Id);
            return service;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding service {ServiceName}", service.Name);
            throw;
        }
    }

    public async Task<bool> UpdateServiceAsync(HostedService service)
    {
        try
        {
            var existingService = await _context.Services.FindAsync(service.Id);
            if (existingService == null)
            {
                return false;
            }

            existingService.Name = service.Name;
            existingService.Description = service.Description;
            existingService.Url = service.Url;
            existingService.ContainerId = service.ContainerId;
            existingService.IsDockerContainer = service.IsDockerContainer;
            existingService.Status = service.Status;
            existingService.LastChecked = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating service {ServiceId}", service.Id);
            return false;
        }
    }

    public async Task<bool> DeleteServiceAsync(Guid id)
    {
        try
        {
            var service = await _context.Services.FindAsync(id);
            if (service == null)
            {
                return false;
            }

            _context.Services.Remove(service);
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting service {ServiceId}", id);
            return false;
        }
    }

    public async Task<bool> CheckServiceHealthAsync(Guid id)
    {
        try
        {
            var service = await _context.Services.FindAsync(id);
            if (service == null)
            {
                return false;
            }

            // Simple HTTP health check
            if (!string.IsNullOrEmpty(service.Url))
            {
                using var client = new HttpClient();
                client.Timeout = TimeSpan.FromSeconds(5);
                
                try
                {
                    var response = await client.GetAsync(service.Url);
                    service.Status = response.IsSuccessStatusCode ? "Healthy" : "Unhealthy";
                }
                catch
                {
                    service.Status = "Unhealthy";
                }
            }
            else
            {
                service.Status = "Unknown";
            }

            service.LastChecked = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking health for service {ServiceId}", id);
            return false;
        }
    }
}