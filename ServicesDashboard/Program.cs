using FastEndpoints;
using FastEndpoints.Swagger;
using ServicesDashboard.Services;
using ServicesDashboard.Services.LogCollection;
using ServicesDashboard.Services.NetworkDiscovery;
using ServicesDashboard.Data;
using ServicesDashboard.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.OpenApi.Models;
using OllamaSharp;
using System.Text.Json.Serialization;
using ServicesDashboard.Services.ArtificialIntelligence;
using ServicesDashboard.Services.Docker;
using ServicesDashboard.Services.Servers;
using ServicesDashboard.Services.Settings;
using ServicesDashboard.Services.Tasks;
using ServicesDashboard.Hubs;
using ServicesDashboard.Services.Deployment;
using ServicesDashboard.Services.Git;
using ServicesDashboard.Services.SelfHosted;

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel to allow larger request bodies (100MB for database imports)
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.Limits.MaxRequestBodySize = 100 * 1024 * 1024; // 100 MB
});

// Add FastEndpoints
builder.Services.AddFastEndpoints();

// Controllers have been replaced with FastEndpoints
// JSON options are now configured via ConfigureHttpJsonOptions below

builder.Services.AddEndpointsApiExplorer();

// Add configuration
builder.Services.Configure<AppSettings>(builder.Configuration.GetSection("AppSettings"));

// Add Entity Framework with support for PostgreSQL, SQLite, and SQL Server
var databaseProvider = builder.Configuration.GetValue<string>("DatabaseProvider") ?? "PostgreSQL";
builder.Services.AddDbContext<ServicesDashboardContext>(options =>
{
    switch (databaseProvider.ToLowerInvariant())
    {
        case "sqlite":
            var sqliteConnection = builder.Configuration.GetConnectionString("SQLiteConnection")
                ?? "Data Source=servicesdashboard.db";
            options.UseSqlite(sqliteConnection);
            Console.WriteLine($"🗄️ Using SQLite database: {sqliteConnection}");
            break;

        case "sqlserver":
            var sqlServerConnection = builder.Configuration.GetConnectionString("SqlServerConnection")
                ?? builder.Configuration.GetConnectionString("DefaultConnection");
            options.UseSqlServer(sqlServerConnection);
            Console.WriteLine("🗄️ Using SQL Server database");
            break;

        case "postgresql":
        default:
            options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));
            Console.WriteLine("🗄️ Using PostgreSQL database");
            break;
    }

    // Suppress the PendingModelChangesWarning for multi-provider scenarios
    // The migrations are generated with PostgreSQL but work across all providers
    options.ConfigureWarnings(warnings =>
        warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
});

// Add OllamaSharp client
builder.Services.AddSingleton<IOllamaApiClient>(provider => 
{
    var settings = provider.GetRequiredService<Microsoft.Extensions.Options.IOptions<AppSettings>>().Value;
    return new OllamaApiClient(settings.Ollama.BaseUrl);
});

// Add logging to see Swagger generation errors
builder.Services.AddLogging(builder => builder.AddConsole().SetMinimumLevel(LogLevel.Debug));

// Configure Swagger/OpenAPI via FastEndpoints
builder.Services.SwaggerDocument(o =>
{
    o.DocumentSettings = s =>
    {
        s.Title = "Services Dashboard API";
        s.Version = "v1";
        s.Description = "API for managing and monitoring containerized services";
    };
});

// Register our services
builder.Services.AddScoped<IUserServices, UserServices>();
builder.Services.AddSingleton<IDockerLogCollector, DockerDockerLogCollector>();
builder.Services.AddSingleton<ILogAnalyzer, LogAnalyzer>();
builder.Services.AddSingleton<IServerConnectionManager, ServerConnectionManager>();
builder.Services.AddScoped<IRemoteLogCollector, RemoteDockerLogCollector>();
builder.Services.AddScoped<INetworkDiscoveryService, NetworkDiscovery>();
builder.Services.AddScoped<IServiceRecognitionService, ServiceRecognition>();
builder.Services.AddScoped<IApplicationSettings, ApplicationSettings>();
builder.Services.AddScoped<IServerManagementService, ServerManagement>();
builder.Services.AddSingleton<BackgroundNetworkScan>();
builder.Services.AddSingleton<IBackgroundNetworkScanService>(provider => provider.GetService<BackgroundNetworkScan>()!);
builder.Services.AddHostedService<BackgroundNetworkScan>(provider => provider.GetService<BackgroundNetworkScan>()!);
builder.Services.AddScoped<ISettingsService, DatabaseSettingsService>();
builder.Services.AddScoped<IDockerServicesService, DockerServicesService>();
builder.Services.AddScoped<IScheduledTaskService, ScheduledTaskService>();
builder.Services.AddHostedService<ScheduledTaskExecutorWorker>();
builder.Services.AddHostedService<ServicesDashboard.Services.Metrics.ContainerMetricsCollector>();
builder.Services.AddScoped<ServicesDashboard.Services.Database.IDatabaseMigrationService, ServicesDashboard.Services.Database.DatabaseMigrationService>();
builder.Services.AddHttpClient();

// Git Provider and Deployment Management Services
builder.Services.AddScoped<IGitProviderService, GitProviderService>();
builder.Services.AddScoped<IGitApiClientFactory, GitApiClientFactory>();
builder.Services.AddScoped<IGitRepositoryService, GitRepositoryService>();
builder.Services.AddScoped<IPortAllocationService, PortAllocationService>();
builder.Services.AddScoped<IDeploymentService, DeploymentService>();
builder.Services.AddScoped<IDeploymentExecutor, DeploymentExecutor>();
builder.Services.AddScoped<IAiDeploymentAssistant, AiDeploymentAssistant>();

// Self-Hosted Services (Unified Docker + Deployments)
builder.Services.AddScoped<ISelfHostedServicesService, SelfHostedServicesService>();
builder.Services.AddScoped<IPortManagementService, PortManagementService>();

// Update Service
builder.Services.AddScoped<IUpdateService, UpdateService>();

// IP Management Services
builder.Services.AddScoped<ServicesDashboard.Services.IpManagement.IIpManagementService, ServicesDashboard.Services.IpManagement.IpManagementService>();
builder.Services.AddScoped<ServicesDashboard.Services.IpManagement.IOmadaControllerService, ServicesDashboard.Services.IpManagement.OmadaControllerService>();

// AI Error Analysis Service
builder.Services.AddScoped<ServicesDashboard.Services.AI.IAIErrorAnalysisService, ServicesDashboard.Services.AI.AIErrorAnalysisService>();

// Add SignalR for real-time notifications
builder.Services.AddSignalR();

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor |
                               Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto |
                               Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedHost;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// CORS configuration for SignalR and API
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",   // Local dev frontend
                "http://localhost:5050",   // Local production frontend
                "http://frontend:5173",    // Docker dev frontend
                "http://frontend:80",      // Docker production frontend
                "http://frontend"          // Docker internal
              )
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials(); // Required for SignalR
    });
});

// Configure JSON options for minimal APIs
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    options.SerializerOptions.WriteIndented = true;
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

var app = builder.Build();

// Then after var app = builder.Build(); add:
app.UseForwardedHeaders();

// Automatic database migration and creation
await ApplyMigrationsAsync(app.Services);

// Configure the HTTP request pipeline.
// Keep the developer exception page only for development
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

// Rest of your configuration...
app.UseCors();
app.UseAuthorization();

// Use FastEndpoints with camelCase JSON serialization
app.UseFastEndpoints(config =>
{
    config.Serializer.Options.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    config.Serializer.Options.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    config.Serializer.Options.Converters.Add(new JsonStringEnumConverter());
});

// Enable Swagger via FastEndpoints
app.UseSwaggerGen();

// Map SignalR hub
app.MapHub<DiscoveryNotificationHub>("/hubs/discovery");

Console.WriteLine("🚀 Application starting...");
Console.WriteLine($"🌍 Environment: {app.Environment.EnvironmentName}");

await app.RunAsync();

// Method to handle automatic migrations
static async Task ApplyMigrationsAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    var databaseProvider = configuration.GetValue<string>("DatabaseProvider") ?? "PostgreSQL";

    try
    {
        logger.LogInformation("🗄️ Checking database connection for {Provider}...", databaseProvider);

        // Retry connection with delay
        var maxRetries = 5;
        var retryCount = 0;
        while (retryCount < maxRetries)
        {
            var canConnect = await context.Database.CanConnectAsync();
            if (canConnect)
            {
                break;
            }

            retryCount++;
            logger.LogWarning("⚠️ Cannot connect to database (attempt {Attempt}/{MaxRetries}), retrying in 5 seconds...",
                retryCount, maxRetries);
            await Task.Delay(5000);
        }

        // For SQL Server, use EnsureCreated instead of migrations
        // because the migrations are generated for PostgreSQL with PostgreSQL-specific types
        if (databaseProvider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogInformation("🔄 Setting up SQL Server database schema...");

            // Check if the main table exists to determine if schema needs to be created
            var tablesExist = await CheckIfTablesExistAsync(context);

            if (!tablesExist)
            {
                logger.LogInformation("📦 Tables not found, creating schema...");

                // EnsureCreated won't work if DB exists but tables don't
                // So we need to use the model to create the schema directly
                var databaseCreator = context.Database.GetService<Microsoft.EntityFrameworkCore.Storage.IRelationalDatabaseCreator>();
                await databaseCreator.CreateTablesAsync();

                logger.LogInformation("✅ SQL Server database schema created successfully!");
            }
            else
            {
                logger.LogInformation("✅ SQL Server database schema already exists!");
            }
        }
        else
        {
            // For PostgreSQL and SQLite, use migrations
            logger.LogInformation("🔄 Applying database migrations...");

            // Get pending migrations
            var pendingMigrations = await context.Database.GetPendingMigrationsAsync();
            var appliedMigrations = await context.Database.GetAppliedMigrationsAsync();

            logger.LogInformation($"📊 Applied migrations: {appliedMigrations.Count()}");
            logger.LogInformation($"🆕 Pending migrations: {pendingMigrations.Count()}");

            if (pendingMigrations.Any())
            {
                logger.LogInformation("⚡ Applying pending migrations...");
                foreach (var migration in pendingMigrations)
                {
                    logger.LogInformation($"   - {migration}");
                }

                await context.Database.MigrateAsync();
                logger.LogInformation("✅ Migrations applied successfully!");
            }
            else
            {
                logger.LogInformation("✅ Database is up to date!");
            }
        }

        // Optionally seed some initial data
        await SeedInitialDataAsync(context, logger);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "❌ Error during database setup: {ErrorMessage}", ex.Message);

        // In development, you might want to continue anyway
        // In production, you might want to throw to prevent startup
        if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") != "Development")
        {
            throw;
        }

        logger.LogWarning("⚠️ Continuing startup despite database setup error (Development mode)");
    }
}

// Optional: Seed initial data
static async Task SeedInitialDataAsync(ServicesDashboardContext context, ILogger logger)
{
    try
    {
        // Check if we need to seed any initial data
        if (!await context.ManagedServers.AnyAsync())
        {
            logger.LogInformation("🌱 Seeding initial data...");
            
            // Add any initial data you want here
            // For example:
            /*
            var initialServer = new ManagedServer
            {
                Name = "Example Server",
                HostAddress = "192.168.1.100",
                Type = ServerType.Server,
                Status = ServerStatus.Unknown,
                Username = "admin"
            };
            
            context.ManagedServers.Add(initialServer);
            await context.SaveChangesAsync();
            */
            
            logger.LogInformation("✅ Initial data seeded!");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "❌ Error seeding initial data: {ErrorMessage}", ex.Message);
        // Don't throw - seeding is optional
    }
}

// Check if database tables exist
static async Task<bool> CheckIfTablesExistAsync(ServicesDashboardContext context)
{
    try
    {
        // Try to query the ManagedServers table - if it doesn't exist, this will throw
        await context.Database.ExecuteSqlRawAsync(
            "SELECT TOP 1 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ManagedServers'");

        // Also check if we can actually query the table
        var canQuery = await context.Database.ExecuteSqlRawAsync(
            "IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ManagedServers') SELECT 1 ELSE SELECT 0");

        return canQuery > 0;
    }
    catch
    {
        return false;
    }
}

// Make Program class accessible for integration tests
public partial class Program { }