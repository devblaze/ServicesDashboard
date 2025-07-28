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

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Add configuration
builder.Services.Configure<AppSettings>(builder.Configuration.GetSection("AppSettings"));

// Add Entity Framework
builder.Services.AddDbContext<ServicesDashboardContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

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
builder.Services.AddScoped<INetworkDiscoveryService, NetworkDiscoveryService>();
builder.Services.AddScoped<IAIServiceRecognitionService, AIServiceRecognitionService>();
builder.Services.AddScoped<ISettingsService, SettingsService>(); // Add this line
builder.Services.AddHttpClient();

// Configure CORS for frontend
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",    // Vite dev server
                "http://localhost:5173",    // Alternative Vite port
                "http://frontend:80",       // Docker container
                "http://localhost:8080"     // Frontend container on host
            )
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

var app = builder.Build();

// Create database if it doesn't exist
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ServicesDashboardContext>();
    context.Database.EnsureCreated();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    
    try
    {
        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "Services Dashboard API v1");
            c.RoutePrefix = "swagger";
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Swagger configuration error: {ex.Message}");
        Console.WriteLine($"Stack trace: {ex.StackTrace}");
    }
}

app.UseCors();
app.UseAuthorization();

app.MapControllers();

await app.RunAsync();

// Operation filter to help debug Swagger issues
public class SwaggerOperationFilter : Swashbuckle.AspNetCore.SwaggerGen.IOperationFilter
{
    public void Apply(Microsoft.OpenApi.Models.OpenApiOperation operation, Swashbuckle.AspNetCore.SwaggerGen.OperationFilterContext context)
    {
        Console.WriteLine($"Processing operation: {context.MethodInfo.DeclaringType?.Name}.{context.MethodInfo.Name}");
    }
}