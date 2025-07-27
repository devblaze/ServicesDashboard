using ServicesDashboard.Services;
using ServicesDashboard.Services.ServiceManagement;
using ServicesDashboard.Services.LogCollection;
using ServicesDashboard.Services.AIAnalysis;
using ServicesDashboard.Services.ServerConnection;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

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
builder.Services.AddSingleton<IServiceManager, ServiceManager>();
builder.Services.AddSingleton<ILogCollector, DockerLogCollector>();
builder.Services.AddSingleton<ILogAnalyzer, OllamaLogAnalyzer>();
builder.Services.AddSingleton<IServerConnectionManager, ServerConnectionManager>();
builder.Services.AddScoped<IRemoteLogCollector, RemoteDockerLogCollector>();
builder.Services.AddHttpClient();

// Configure CORS
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

// Debug: List all registered controllers
var controllerActionDescriptorProvider = app.Services.GetRequiredService<Microsoft.AspNetCore.Mvc.Infrastructure.IActionDescriptorCollectionProvider>();
var routes = controllerActionDescriptorProvider.ActionDescriptors.Items
    .Where(x => x is Microsoft.AspNetCore.Mvc.Controllers.ControllerActionDescriptor)
    .Cast<Microsoft.AspNetCore.Mvc.Controllers.ControllerActionDescriptor>()
    .Select(x => new { 
        Controller = x.ControllerName, 
        Action = x.ActionName, 
        Route = x.AttributeRouteInfo?.Template 
    }).ToList();

Console.WriteLine("=== Registered Controllers and Actions ===");
foreach (var route in routes)
{
    Console.WriteLine($"Controller: {route.Controller}, Action: {route.Action}, Route: {route.Route}");
}
Console.WriteLine("==========================================");

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

app.UseHttpsRedirection();
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