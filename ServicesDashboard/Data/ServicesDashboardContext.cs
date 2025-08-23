using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Models;
using ServicesDashboard.Models.ServerManagement;

namespace ServicesDashboard.Data;

public class ServicesDashboardContext : DbContext
{
    public ServicesDashboardContext(DbContextOptions<ServicesDashboardContext> options) : base(options)
    {
    }

    // Existing DbSets
    public DbSet<HostedService> HostedServices { get; set; }
    public DbSet<OllamaSettings> OllamaSettings { get; set; }

    // New Server Management DbSets
    public DbSet<ManagedServer> ManagedServers { get; set; }
    public DbSet<ServerHealthCheck> ServerHealthChecks { get; set; }
    public DbSet<UpdateReport> UpdateReports { get; set; }
    public DbSet<ServerAlert> ServerAlerts { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure relationships
        modelBuilder.Entity<ServerHealthCheck>()
            .HasOne(h => h.Server)
            .WithMany(s => s.HealthChecks)
            .HasForeignKey(h => h.ServerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UpdateReport>()
            .HasOne(u => u.Server)
            .WithMany(s => s.UpdateReports)
            .HasForeignKey(u => u.ServerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ServerAlert>()
            .HasOne(a => a.Server)
            .WithMany(s => s.Alerts)
            .HasForeignKey(a => a.ServerId)
            .OnDelete(DeleteBehavior.Cascade);

        // Configure indexes
        modelBuilder.Entity<ManagedServer>()
            .HasIndex(s => s.HostAddress)
            .IsUnique();

        modelBuilder.Entity<ServerHealthCheck>()
            .HasIndex(h => h.CheckTime);

        modelBuilder.Entity<UpdateReport>()
            .HasIndex(u => u.ScanTime);

        modelBuilder.Entity<ServerAlert>()
            .HasIndex(a => new { a.ServerId, a.IsResolved });
    }
}