using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data.Entities;
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
    public DbSet<NetworkScanSession> NetworkScanSessions { get; set; }
    public DbSet<StoredDiscoveredService> StoredDiscoveredServices { get; set; }
    public DbSet<ApplicationSetting> ApplicationSettings { get; set; }
    public DbSet<DockerServiceArrangement> DockerServiceArrangements { get; set; }
    public DbSet<SshCredential> SshCredentials { get; set; }
    public DbSet<ScheduledTask> ScheduledTasks { get; set; }
    public DbSet<ScheduledTaskServer> ScheduledTaskServers { get; set; }
    public DbSet<TaskExecution> TaskExecutions { get; set; }
    public DbSet<GitProviderConnection> GitProviderConnections { get; set; }
    public DbSet<GitRepository> GitRepositories { get; set; }
    public DbSet<Deployment> Deployments { get; set; }
    public DbSet<DeploymentEnvironment> DeploymentEnvironments { get; set; }
    public DbSet<PortAllocation> PortAllocations { get; set; }

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

            // Configure parent-child relationship
            entity.HasOne(e => e.ParentServer)
                  .WithMany(e => e.ChildServers)
                  .HasForeignKey(e => e.ParentServerId)
                  .OnDelete(DeleteBehavior.SetNull); // When parent is deleted, set child's ParentServerId to null
        });

        // Configure DockerServiceArrangement
        modelBuilder.Entity<DockerServiceArrangement>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ContainerId).IsRequired().HasMaxLength(64);
            entity.Property(e => e.ContainerName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasOne(e => e.Server)
                  .WithMany()
                  .HasForeignKey(e => e.ServerId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.ServerId, e.ContainerId }).IsUnique();
            entity.HasIndex(e => e.Order);
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

        // Configure HostedService
        modelBuilder.Entity<HostedService>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired();
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.DateAdded).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.LastChecked).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });
        
        // Configure OllamaSettings
        modelBuilder.Entity<OllamaSettingsEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.BaseUrl).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Model).IsRequired().HasMaxLength(100);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        // Configure SshCredential
        modelBuilder.Entity<SshCredential>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Username).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Password).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.Name).IsUnique();
        });

        // Configure NetworkScanSession
        modelBuilder.Entity<NetworkScanSession>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Target).IsRequired().HasMaxLength(255);
            entity.Property(e => e.StartedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(s => new { s.Target, s.StartedAt });
        });
        
        modelBuilder.Entity<NetworkScanSession>()
            .HasMany(s => s.DiscoveredServices)
            .WithOne(d => d.ScanSession)
            .HasForeignKey(d => d.ScanId)
            .OnDelete(DeleteBehavior.Cascade);
        
        // Configure StoredDiscoveredService
        modelBuilder.Entity<StoredDiscoveredService>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.ScanSession)
                  .WithMany(e => e.DiscoveredServices)
                  .HasForeignKey(e => e.ScanId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.HostAddress).IsRequired().HasMaxLength(255);
            entity.Property(e => e.HostName).HasMaxLength(255);
            entity.Property(e => e.ServiceType).HasMaxLength(100);
            entity.Property(e => e.DiscoveredAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.ServiceKey).HasMaxLength(300);
            entity.HasIndex(s => new { s.HostAddress, s.Port });
            entity.HasIndex(s => s.DiscoveredAt);
            entity.HasIndex(s => s.ServiceKey);
            entity.HasIndex(s => new { s.HostAddress, s.Port, s.ServiceKey });
        });

        // Configure ApplicationSetting
        modelBuilder.Entity<ApplicationSetting>()
            .HasIndex(s => new { s.Category, s.Key })
            .IsUnique();

        modelBuilder.Entity<ApplicationSetting>()
            .Property(s => s.UpdatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        // Configure ScheduledTask
        modelBuilder.Entity<ScheduledTask>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Command).IsRequired();
            entity.Property(e => e.CronExpression).IsRequired().HasMaxLength(100);
            entity.Property(e => e.TimeZone).HasMaxLength(100);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.IsEnabled);
            entity.HasIndex(e => e.NextExecutionTime);
        });

        // Configure ScheduledTaskServer
        modelBuilder.Entity<ScheduledTaskServer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.ScheduledTask)
                  .WithMany(e => e.TaskServers)
                  .HasForeignKey(e => e.ScheduledTaskId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Server)
                  .WithMany()
                  .HasForeignKey(e => e.ServerId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.ScheduledTaskId, e.ServerId }).IsUnique();
        });

        // Configure TaskExecution
        modelBuilder.Entity<TaskExecution>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.ScheduledTask)
                  .WithMany(e => e.Executions)
                  .HasForeignKey(e => e.ScheduledTaskId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Server)
                  .WithMany()
                  .HasForeignKey(e => e.ServerId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.StartedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.StartedAt);
            entity.HasIndex(e => new { e.ScheduledTaskId, e.StartedAt });
            entity.HasIndex(e => new { e.ServerId, e.StartedAt });
        });

        // Configure GitProviderConnection
        modelBuilder.Entity<GitProviderConnection>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.ProviderType).HasConversion<string>();
            entity.Property(e => e.BaseUrl).IsRequired().HasMaxLength(500);
            entity.Property(e => e.AccessToken).IsRequired().HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.Name).IsUnique();
        });

        // Configure GitRepository
        modelBuilder.Entity<GitRepository>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.GitProviderConnection)
                  .WithMany(e => e.Repositories)
                  .HasForeignKey(e => e.GitProviderConnectionId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => new { e.GitProviderConnectionId, e.FullName }).IsUnique();
        });

        // Configure Deployment
        modelBuilder.Entity<Deployment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.GitRepository)
                  .WithMany(e => e.Deployments)
                  .HasForeignKey(e => e.GitRepositoryId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Server)
                  .WithMany()
                  .HasForeignKey(e => e.ServerId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Type).HasConversion<string>();
            entity.Property(e => e.Status).HasConversion<string>();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => new { e.GitRepositoryId, e.Name }).IsUnique();
            entity.HasIndex(e => e.Status);
        });

        // Configure DeploymentEnvironment
        modelBuilder.Entity<DeploymentEnvironment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Deployment)
                  .WithMany(e => e.Environments)
                  .HasForeignKey(e => e.DeploymentId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Type).HasConversion<string>();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => new { e.DeploymentId, e.Name }).IsUnique();
        });

        // Configure PortAllocation
        modelBuilder.Entity<PortAllocation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Server)
                  .WithMany()
                  .HasForeignKey(e => e.ServerId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Deployment)
                  .WithMany(e => e.AllocatedPorts)
                  .HasForeignKey(e => e.DeploymentId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.AllocatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => new { e.ServerId, e.Port }).IsUnique();
        });
    }
}