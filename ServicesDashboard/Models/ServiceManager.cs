using ServicesDashboard.Models;

namespace ServicesDashboard.Services.ServiceManagement;

public class ServiceManager : IServiceManager
{
    private readonly List<HostedService> _services = new();
    private readonly ILogger<ServiceManager> _logger;

    public ServiceManager(ILogger<ServiceManager> logger)
    {
        _logger = logger;
    }

    public Task<IEnumerable<HostedService>> GetAllServicesAsync()
    {
        return Task.FromResult(_services.AsEnumerable());
    }

    public Task<HostedService?> GetServiceByIdAsync(Guid id)
    {
        return Task.FromResult(_services.FirstOrDefault(s => s.Id == id));
    }

    public Task<HostedService> AddServiceAsync(HostedService service)
    {
        service.Id = Guid.NewGuid();
        service.DateAdded = DateTime.UtcNow;
        service.LastChecked = DateTime.UtcNow;
        
        _services.Add(service);
        _logger.LogInformation("Added new service: {ServiceName}", service.Name);
        
        return Task.FromResult(service);
    }

    public Task<bool> UpdateServiceAsync(HostedService service)
    {
        var index = _services.FindIndex(s => s.Id == service.Id);
        if (index == -1)
            return Task.FromResult(false);
        
        _services[index] = service;
        _logger.LogInformation("Updated service: {ServiceName}", service.Name);
        
        return Task.FromResult(true);
    }

    public Task<bool> DeleteServiceAsync(Guid id)
    {
        var service = _services.FirstOrDefault(s => s.Id == id);
        if (service == null)
            return Task.FromResult(false);
        
        _services.Remove(service);
        _logger.LogInformation("Deleted service: {ServiceName}", service.Name);
        
        return Task.FromResult(true);
    }

    public Task<bool> CheckServiceHealthAsync(Guid id)
    {
        var service = _services.FirstOrDefault(s => s.Id == id);
        if (service == null)
            return Task.FromResult(false);
        
        // In a real implementation, you would check the service health here
        // For now, we'll just update the last checked time
        service.LastChecked = DateTime.UtcNow;
        
        return Task.FromResult(true);
    }
}