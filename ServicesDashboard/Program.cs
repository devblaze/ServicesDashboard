using ServicesDashboard.Services.ServiceManagement;
using ServicesDashboard.Services.LogCollection;
using ServicesDashboard.Services.AIAnalysis;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// Register our services
builder.Services.AddSingleton<IServiceManager, ServiceManager>();
builder.Services.AddSingleton<ILogCollector, DockerLogCollector>();
builder.Services.AddSingleton<ILogAnalyzer, OllamaLogAnalyzer>();
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

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthorization();

app.MapControllers();

app.Run();