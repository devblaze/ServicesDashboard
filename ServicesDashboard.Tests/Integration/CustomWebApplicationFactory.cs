using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using ServicesDashboard.Data;

namespace ServicesDashboard.Tests.Integration;

public class CustomWebApplicationFactory<TProgram> : WebApplicationFactory<TProgram> where TProgram : class
{
    protected override IHost CreateHost(IHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Remove all DbContext-related registrations before any service provider is built
            var descriptorsToRemove = services
                .Where(d => d.ServiceType == typeof(DbContextOptions<ServicesDashboardContext>) ||
                           d.ServiceType == typeof(DbContextOptions) ||
                           d.ServiceType == typeof(ServicesDashboardContext))
                .ToList();

            foreach (var descriptor in descriptorsToRemove)
            {
                services.Remove(descriptor);
            }

            // Add in-memory database for testing
            services.AddDbContext<ServicesDashboardContext>(options =>
            {
                options.UseInMemoryDatabase("InMemoryTestDb");
            });
        });

        return base.CreateHost(builder);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
    }
}
