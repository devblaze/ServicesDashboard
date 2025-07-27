using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Models;

namespace ServicesDashboard.Data;

public class ServicesDashboardContext : DbContext
{
    public ServicesDashboardContext(DbContextOptions<ServicesDashboardContext> options)
        : base(options)
    {
    }

    public DbSet<HostedService> Services { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<HostedService>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.Url).HasMaxLength(500);
            entity.Property(e => e.ContainerId).HasMaxLength(100);
            entity.Property(e => e.Status).HasMaxLength(50);
            entity.Property(e => e.LastChecked).HasDefaultValueSql("NOW()");
            entity.Property(e => e.DateAdded).HasDefaultValueSql("NOW()");
        });
    }
}
