using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;

namespace ServicesDashboard.Endpoints.Settings;

public class DatabaseSettingsResponse
{
    public string Provider { get; set; } = string.Empty;
    public string ProviderDisplayName { get; set; } = string.Empty;
    public bool IsConnected { get; set; }
    public string? ServerVersion { get; set; }
    public string[] AvailableProviders { get; set; } = [];
    public string ConfigurationNote { get; set; } = string.Empty;
}

public class GetDatabaseSettingsEndpoint : EndpointWithoutRequest<DatabaseSettingsResponse>
{
    private readonly ServicesDashboardContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GetDatabaseSettingsEndpoint> _logger;

    public GetDatabaseSettingsEndpoint(
        ServicesDashboardContext context,
        IConfiguration configuration,
        ILogger<GetDatabaseSettingsEndpoint> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public override void Configure()
    {
        Get("/api/settings/database");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        try
        {
            var provider = _configuration.GetValue<string>("DatabaseProvider") ?? "PostgreSQL";
            var isConnected = await _context.Database.CanConnectAsync(ct);

            string? serverVersion = null;
            string displayName;

            try
            {
                if (isConnected)
                {
                    var connection = _context.Database.GetDbConnection();
                    serverVersion = connection.ServerVersion;
                }
            }
            catch
            {
                // Ignore version fetch errors
            }

            displayName = provider.ToLowerInvariant() switch
            {
                "postgresql" => "PostgreSQL",
                "sqlserver" => "SQL Server",
                "sqlite" => "SQLite",
                _ => provider
            };

            var response = new DatabaseSettingsResponse
            {
                Provider = provider,
                ProviderDisplayName = displayName,
                IsConnected = isConnected,
                ServerVersion = serverVersion,
                AvailableProviders = ["PostgreSQL", "SqlServer", "SQLite"],
                ConfigurationNote = "Database provider is configured via the DATABASE_PROVIDER environment variable. Changing providers requires restarting the application and may require data migration."
            };

            await Send.OkAsync(response, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get database settings");
            await Send.OkAsync(new DatabaseSettingsResponse
            {
                Provider = "Unknown",
                ProviderDisplayName = "Unknown",
                IsConnected = false,
                ConfigurationNote = $"Error: {ex.Message}"
            }, ct);
        }
    }
}
