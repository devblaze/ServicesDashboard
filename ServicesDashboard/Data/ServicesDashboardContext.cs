using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Models;

namespace ServicesDashboard.Data;

public class ServicesDashboardContext : DbContext
{
    public ServicesDashboardContext(DbContextOptions<ServicesDashboardContext> options) : base(options)
    {
    }

    public DbSet<HostedService> HostedServices { get; set; }
    public DbSet<OllamaSettingsEntity> OllamaSettings { get; set; }
    public DbSet<ManagedServer> ManagedServers { get; set; }
    public DbSet<ServerHealthCheck> ServerHealthChecks { get; set; }
    public DbSet<UpdateReport> UpdateReports { get; set; }
    public DbSet<ServerAlert> ServerAlerts { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure ManagedServer
        modelBuilder.Entity<ManagedServer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.HostAddress).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Username).HasMaxLength(100);
            entity.Property(e => e.Type).HasConversion<string>();
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(s => s.HostAddress).IsUnique();
        });

        // Configure ServerHealthCheck
        modelBuilder.Entity<ServerHealthCheck>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Server)
                  .WithMany(e => e.HealthChecks)
                  .HasForeignKey(e => e.ServerId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.CheckTime).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(h => h.CheckTime);
        });

        // Configure UpdateReport
        modelBuilder.Entity<UpdateReport>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Server)
                  .WithMany(e => e.UpdateReports)
                  .HasForeignKey(e => e.ServerId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.ScanTime).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(u => u.ScanTime);
        });

        // Configure ServerAlert
        modelBuilder.Entity<ServerAlert>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Server)
                  .WithMany(e => e.Alerts)
                  .HasForeignKey(e => e.ServerId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.Type).HasConversion<string>();
            entity.Property(e => e.Severity).HasConversion<string>();
            entity.Property(e => e.Message).IsRequired().HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(a => new { a.ServerId, a.IsResolved });
        });

        // Configure HostedService if it exists
        modelBuilder.Entity<HostedService>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired();
            entity.Property(e => e.Status).HasConversion<string>();
        });

        modelBuilder.Entity<OllamaSettingsEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.BaseUrl).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Model).IsRequired().HasMaxLength(100);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });
    }
}