using ServicesDashboard.Services;
using ServicesDashboard.Services.LogCollection;
using ServicesDashboard.Services.AIAnalysis;
using ServicesDashboard.Services.ServerConnection;
using ServicesDashboard.Services.NetworkDiscovery;
using ServicesDashboard.Services.AIServiceRecognition;
using ServicesDashboard.Data;
using ServicesDashboard.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using ServicesDashboard.Services.ServerManagement;
using OllamaSharp;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Add configuration
builder.Services.Configure<AppSettings>(builder.Configuration.GetSection("AppSettings"));

// Add Entity Framework
builder.Services.AddDbContext<ServicesDashboardContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Add OllamaSharp client
builder.Services.AddSingleton<IOllamaApiClient>(provider => 
{
    var settings = provider.GetRequiredService<Microsoft.Extensions.Options.IOptions<AppSettings>>().Value;
    return new OllamaApiClient(settings.Ollama.BaseUrl);
});

// Add logging to see Swagger generation errors
builder.Services.AddLogging(builder => builder.AddConsole().SetMinimumLevel(LogLevel.Debug));

// Configure Swagger/OpenAPI
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Services Dashboard API",
        Version = "v1",
        Description = "API for managing and monitoring containerized services"
    });

    // Use full type names to avoid conflicts
    c.CustomSchemaIds(type => type.FullName?.Replace("+", "."));
        
    // Add more verbose error handling
    c.OperationFilter<SwaggerOperationFilter>();
});

// Register our services
builder.Services.AddScoped<IServiceManager, ServiceManager>();
builder.Services.AddSingleton<ILogCollector, DockerLogCollector>();
builder.Services.AddSingleton<ILogAnalyzer, OllamaLogAnalyzer>();
builder.Services.AddSingleton<IServerConnectionManager, ServerConnectionManager>();
builder.Services.AddScoped<IRemoteLogCollector, RemoteDockerLogCollector>();
builder.Services.AddScoped<INetworkDiscoveryService, NetworkDiscovery>();
builder.Services.AddScoped<IAIServiceRecognitionService, AIServiceRecognition>();
builder.Services.AddScoped<ISettingsService, SettingsService>();
builder.Services.AddScoped<IServerManagementService, ServerManagement>();
builder.Services.AddHttpClient();

// Temporary more permissive CORS for debugging
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Automatic database migration and creation
await ApplyMigrationsAsync(app.Services);

// Configure the HTTP request pipeline.
// Move Swagger configuration before other middleware
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Services Dashboard API v1");
    c.RoutePrefix = "swagger";
});

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

// IMPORTANT: CORS must come before Authorization and MapControllers
app.UseCors();

// Add a simple health check endpoint for debugging
app.MapGet("/health", () => new { Status = "Healthy", Timestamp = DateTime.UtcNow, Environment = app.Environment.EnvironmentName });

app.UseAuthorization();
app.MapControllers();

Console.WriteLine("🚀 Application starting...");
Console.WriteLine($"🌍 Environment: {app.Environment.EnvironmentName}");
Console.WriteLine("📋 Available endpoints:");
Console.WriteLine("   - Swagger UI: http://localhost:5000/swagger");
Console.WriteLine("   - Swagger JSON: http://localhost:5000/swagger/v1/swagger.json");
Console.WriteLine("   - Health Check: http://localhost:5000/health");
Console.WriteLine("   - API: http://localhost:5000/api");

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

// Operation filter to help debug Swagger issues
public class SwaggerOperationFilter : Swashbuckle.AspNetCore.SwaggerGen.IOperationFilter
{
    public void Apply(Microsoft.OpenApi.Models.OpenApiOperation operation, Swashbuckle.AspNetCore.SwaggerGen.OperationFilterContext context)
    {
        Console.WriteLine($"Processing operation: {context.MethodInfo.DeclaringType?.Name}.{context.MethodInfo.Name}");
    }
}