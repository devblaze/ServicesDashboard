using FastEndpoints;
using FastEndpoints.Swagger;
using ServicesDashboard.Services;
using ServicesDashboard.Services.LogCollection;
using ServicesDashboard.Services.NetworkDiscovery;
using ServicesDashboard.Data;
using ServicesDashboard.Models;
using Microsoft.EntityFrameworkCore;
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

var builder = WebApplication.CreateBuilder(args);

// Add FastEndpoints
builder.Services.AddFastEndpoints();

// Controllers have been replaced with FastEndpoints
// JSON options are now configured via ConfigureHttpJsonOptions below

builder.Services.AddEndpointsApiExplorer();

// Add configuration
builder.Services.Configure<AppSettings>(builder.Configuration.GetSection("AppSettings"));

// Add Entity Framework with support for both PostgreSQL and SQLite
var databaseProvider = builder.Configuration.GetValue<string>("DatabaseProvider") ?? "PostgreSQL";
builder.Services.AddDbContext<ServicesDashboardContext>(options =>
{
    if (databaseProvider.Equals("SQLite", StringComparison.OrdinalIgnoreCase))
    {
        var sqliteConnection = builder.Configuration.GetConnectionString("SQLiteConnection")
            ?? "Data Source=servicesdashboard.db";
        options.UseSqlite(sqliteConnection);
        Console.WriteLine($"🗄️ Using SQLite database: {sqliteConnection}");
    }
    else
    {
        options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));
        Console.WriteLine("🗄️ Using PostgreSQL database");
    }
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

// Update Service
builder.Services.AddScoped<IUpdateService, UpdateService>();

// IP Management Services
builder.Services.AddScoped<ServicesDashboard.Services.IpManagement.IIpManagementService, ServicesDashboard.Services.IpManagement.IpManagementService>();
builder.Services.AddScoped<ServicesDashboard.Services.IpManagement.IOmadaControllerService, ServicesDashboard.Services.IpManagement.OmadaControllerService>();

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
        policy.WithOrigins("http://localhost:5173", "http://localhost:5050", "http://frontend:5173")
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

// Use FastEndpoints
app.UseFastEndpoints();

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
    
    try
    {
        logger.LogInformation("🗄️ Checking database connection...");
        
        // Check if database can be connected to
        var canConnect = await context.Database.CanConnectAsync();
        if (!canConnect)
        {
            logger.LogWarning("⚠️ Cannot connect to database, retrying in 5 seconds...");
            await Task.Delay(5000);
        }
        
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
        
        // Optionally seed some initial data
        await SeedInitialDataAsync(context, logger);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "❌ Error during database migration: {ErrorMessage}", ex.Message);
        
        // In development, you might want to continue anyway
        // In production, you might want to throw to prevent startup
        if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") != "Development")
        {
            throw;
        }
        
        logger.LogWarning("⚠️ Continuing startup despite migration error (Development mode)");
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

// Make Program class accessible for integration tests
public partial class Program { }