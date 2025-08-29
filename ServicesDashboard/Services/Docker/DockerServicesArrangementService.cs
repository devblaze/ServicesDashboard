using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Models.Dtos;

namespace ServicesDashboard.Services.Docker;

public interface IDockerServicesService
{
    Task<List<DockerServiceWithServer>> ApplyArrangementsAsync(List<DockerServiceWithServer> services);
    Task UpdateArrangementsAsync(List<DockerServiceArrangementDto> arrangements);
}

public class DockerServicesService : IDockerServicesService
{
    private readonly ServicesDashboardContext _context;
    private readonly ILogger<DockerServicesService> _logger;

    public DockerServicesService(ServicesDashboardContext context, ILogger<DockerServicesService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<DockerServiceWithServer>> ApplyArrangementsAsync(List<DockerServiceWithServer> services)
    {
        try
        {
            var arrangements = await _context.DockerServiceArrangements
                .ToDictionaryAsync(a => $"{a.ServerId}:{a.ContainerId}", a => a.Order);

            var arrangedServices = services.Select(service => 
            {
                var key = $"{service.ServerId}:{service.ContainerId}";
                service.Order = arrangements.TryGetValue(key, out var order) ? order : int.MaxValue;
                return service;
            }).ToList();

            // Sort by order, then by name for items without specific order
            return arrangedServices
                .OrderBy(s => s.Order == int.MaxValue ? 1 : 0)
                .ThenBy(s => s.Order)
                .ThenBy(s => s.Name)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error applying arrangements");
            return services.OrderBy(s => s.Name).ToList();
        }
    }

    public async Task UpdateArrangementsAsync(List<DockerServiceArrangementDto> arrangements)
    {
        try
        {
            // Get existing arrangements
            var existingArrangements = await _context.DockerServiceArrangements.ToListAsync();
            var existingDict = existingArrangements.ToDictionary(a => $"{a.ServerId}:{a.ContainerId}");

            foreach (var arrangement in arrangements)
            {
                var key = $"{arrangement.ServerId}:{arrangement.ContainerId}";
                
                if (existingDict.TryGetValue(key, out var existing))
                {
                    existing.Order = arrangement.Order;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    _context.DockerServiceArrangements.Add(new DockerServiceArrangement
                    {
                        ServerId = arrangement.ServerId,
                        ContainerId = arrangement.ContainerId,
                        ContainerName = arrangement.ContainerName,
                        Order = arrangement.Order
                    });
                }
            }

            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating arrangements");
            throw;
        }
    }
}
