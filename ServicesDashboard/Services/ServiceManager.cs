using ServicesDashboard.Models;

namespace ServicesDashboard.Services;

public class ServiceManager : IServiceManager
{
    private readonly ILogger<ServiceManager> _logger;
    private readonly List<HostedService> _services;

    public ServiceManager(ILogger<ServiceManager> logger)
    {
        _logger = logger;
        
        // Initialize with mock data for testing
        _services = new List<HostedService>
        {
            new HostedService
            {
                Id = Guid.NewGuid(),
                Name = "Sample Web Service",
                Description = "A sample web application service",
                Url = "http://localhost:8080",
                ContainerId = "web-service-container",
                IsDockerContainer = true,
                Status = "Running",
                LastChecked = DateTime.UtcNow,
                DateAdded = DateTime.UtcNow.AddDays(-5)
            },
            new HostedService
            {
                Id = Guid.NewGuid(),
                Name = "Database Service",
                Description = "PostgreSQL database service",
                Url = "postgresql://localhost:5432",
                ContainerId = "postgres-container",
                IsDockerContainer = true,
                Status = "Running",
                LastChecked = DateTime.UtcNow,
                DateAdded = DateTime.UtcNow.AddDays(-10)
            },
            new HostedService
            {
                Id = Guid.NewGuid(),
                Name = "API Gateway",
                Description = "Main API gateway service",
                Url = "http://localhost:3000",
                ContainerId = "api-gateway-container",
                IsDockerContainer = true,
                Status = "Stopped",
                LastChecked = DateTime.UtcNow.AddMinutes(-30),
                DateAdded = DateTime.UtcNow.AddDays(-3)
            }
        };
    }

    public async Task<IEnumerable<HostedService>> GetAllServicesAsync()
    {
        try
        {
            _logger.LogInformation("Getting all services, count: {Count}", _services.Count);
            
            // Simulate async operation
            await Task.Delay(100);
            
            return _services;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all services");
            throw;
        }
    }

    public async Task<HostedService?> GetServiceByIdAsync(Guid id)
    {
        try
        {
            await Task.Delay(50);
            return _services.FirstOrDefault(s => s.Id == id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting service by id: {Id}", id);
            throw;
        }
    }

    public async Task<HostedService> AddServiceAsync(HostedService service)
    {
        try
        {
            service.Id = Guid.NewGuid();
            service.DateAdded = DateTime.UtcNow;
            service.LastChecked = DateTime.UtcNow;
            
            _services.Add(service);
            
            _logger.LogInformation("Added new service: {ServiceName}", service.Name);
            
            await Task.Delay(50);
            return service;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding service: {ServiceName}", service.Name);
            throw;
        }
    }

    public async Task<bool> UpdateServiceAsync(HostedService service)
    {
        try
        {
            var existingService = _services.FirstOrDefault(s => s.Id == service.Id);
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

            _logger.LogInformation("Updated service: {ServiceName}", service.Name);
            
            await Task.Delay(50);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating service: {ServiceId}", service.Id);
            throw;
        }
    }

    public async Task<bool> DeleteServiceAsync(Guid id)
    {
        try
        {
            var service = _services.FirstOrDefault(s => s.Id == id);
            if (service == null)
            {
                return false;
            }

            _services.Remove(service);
            
            _logger.LogInformation("Deleted service: {ServiceId}", id);
            
            await Task.Delay(50);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting service: {ServiceId}", id);
            throw;
        }
    }

    public async Task<bool> CheckServiceHealthAsync(Guid id)
    {
        try
        {
            var service = _services.FirstOrDefault(s => s.Id == id);
            if (service == null)
            {
                return false;
            }

            // Mock health check logic
            service.LastChecked = DateTime.UtcNow;
            
            // Randomly update status for demo
            var statuses = new[] { "Running", "Stopped", "Unknown" };
            var random = new Random();
            service.Status = statuses[random.Next(statuses.Length)];

            _logger.LogInformation("Health check completed for service: {ServiceName}, Status: {Status}", 
                service.Name, service.Status);
            
            await Task.Delay(100);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking health for service: {ServiceId}", id);
            throw;
        }
    }
}