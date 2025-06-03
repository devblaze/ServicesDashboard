using ServicesDashboard.Models;

namespace ServicesDashboard.Services.ServiceManagement;

public interface IServiceManager
{
    Task<IEnumerable<HostedService>> GetAllServicesAsync();
    Task<HostedService?> GetServiceByIdAsync(Guid id);
    Task<HostedService> AddServiceAsync(HostedService service);
    Task<bool> UpdateServiceAsync(HostedService service);
    Task<bool> DeleteServiceAsync(Guid id);
    Task<bool> CheckServiceHealthAsync(Guid id);
}