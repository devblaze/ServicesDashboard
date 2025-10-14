using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Models.Dtos;
using Npgsql;
using Microsoft.Data.Sqlite;

namespace ServicesDashboard.Services.Database;

public interface IDatabaseMigrationService
{
    Task<TestDatabaseConnectionResponse> TestConnectionAsync(TestDatabaseConnectionRequest request);
    Task<DatabaseStatusResponse> GetDatabaseStatusAsync();
    Task<MigrateDatabaseResponse> MigrateDatabaseAsync(MigrateDatabaseRequest request);
    Task<DatabaseConfigurationDto> GetCurrentConfigurationAsync();
    Task<bool> SaveConfigurationAsync(UpdateDatabaseConfigurationRequest request);
}

public class DatabaseMigrationService : IDatabaseMigrationService
{
    private readonly ServicesDashboardContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<DatabaseMigrationService> _logger;

    public DatabaseMigrationService(
        ServicesDashboardContext context,
        IConfiguration configuration,
        ILogger<DatabaseMigrationService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<DatabaseStatusResponse> GetDatabaseStatusAsync()
    {
        try
        {
            var canConnect = await _context.Database.CanConnectAsync();

            // Detect actual provider from connection string
            var connectionString = _context.Database.GetConnectionString() ?? "";
            var actualProvider = connectionString.Contains("Host=") || connectionString.Contains("Server=")
                ? "PostgreSQL"
                : "SQLite";

            var response = new DatabaseStatusResponse
            {
                Provider = actualProvider,
                IsConnected = canConnect,
                RequiresSetup = false
            };

            if (canConnect)
            {
                // Get database statistics
                response.TotalTables = await CountTablesAsync();
                response.TotalRecords = await CountTotalRecordsAsync();

                if (actualProvider.Equals("SQLite", StringComparison.OrdinalIgnoreCase))
                {
                    response.ConnectionString = MaskConnectionString(connectionString);
                    response.DatabaseSizeMB = GetSQLiteDatabaseSize();
                }
                else
                {
                    response.ConnectionString = MaskConnectionString(connectionString);
                }
            }
            else
            {
                response.RequiresSetup = true;
            }

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting database status");
            return new DatabaseStatusResponse
            {
                IsConnected = false,
                RequiresSetup = true
            };
        }
    }

    public async Task<TestDatabaseConnectionResponse> TestConnectionAsync(TestDatabaseConnectionRequest request)
    {
        try
        {
            if (request.Provider.Equals("SQLite", StringComparison.OrdinalIgnoreCase))
            {
                return await TestSQLiteConnectionAsync(request.SQLitePath);
            }
            else if (request.Provider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase))
            {
                return await TestPostgreSQLConnectionAsync(
                    request.PostgreSQLHost,
                    request.PostgreSQLPort,
                    request.PostgreSQLDatabase,
                    request.PostgreSQLUsername,
                    request.PostgreSQLPassword);
            }

            return new TestDatabaseConnectionResponse
            {
                Success = false,
                Message = "Invalid database provider"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing database connection");
            return new TestDatabaseConnectionResponse
            {
                Success = false,
                Message = "Connection test failed",
                Error = ex.Message
            };
        }
    }

    public async Task<MigrateDatabaseResponse> MigrateDatabaseAsync(MigrateDatabaseRequest request)
    {
        try
        {
            _logger.LogInformation("Starting database migration to {Provider}", request.TargetProvider);

            // Check if we're already on the target provider
            var currentConnectionString = _context.Database.GetConnectionString() ?? "";
            var currentProvider = currentConnectionString.Contains("Host=") || currentConnectionString.Contains("Server=")
                ? "PostgreSQL"
                : "SQLite";

            if (currentProvider.Equals(request.TargetProvider, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Already using {Provider}, migration cancelled", currentProvider);
                return new MigrateDatabaseResponse
                {
                    Success = false,
                    Message = $"Already using {currentProvider}. Cannot migrate from {currentProvider} to {request.TargetProvider}.",
                    Error = "Source and target database providers are the same"
                };
            }

            var response = new MigrateDatabaseResponse();

            // Build target connection string
            string targetConnectionString;
            DbContextOptionsBuilder<ServicesDashboardContext> optionsBuilder;

            if (request.TargetProvider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase))
            {
                targetConnectionString = BuildPostgreSQLConnectionString(
                    request.PostgreSQLHost,
                    request.PostgreSQLPort,
                    request.PostgreSQLDatabase,
                    request.PostgreSQLUsername,
                    request.PostgreSQLPassword);

                optionsBuilder = new DbContextOptionsBuilder<ServicesDashboardContext>();
                optionsBuilder.UseNpgsql(targetConnectionString);
            }
            else
            {
                return new MigrateDatabaseResponse
                {
                    Success = false,
                    Message = "Migration to SQLite not supported"
                };
            }

            // Create new context for target database
            using var targetContext = new ServicesDashboardContext(optionsBuilder.Options);

            // Ensure target database exists and apply migrations
            await targetContext.Database.MigrateAsync();

            // Test connection to target database
            if (!await targetContext.Database.CanConnectAsync())
            {
                return new MigrateDatabaseResponse
                {
                    Success = false,
                    Message = "Cannot connect to target database",
                    Error = "Connection test failed"
                };
            }

            response.TablesCreated = await CountTablesAsync(targetContext);

            // Check if target already has data - NEVER clear data automatically
            var targetRecordCount = await CountTotalRecordsAsync(targetContext);
            if (targetRecordCount > 0)
            {
                _logger.LogWarning("Target database already contains {Count} records - migration aborted", targetRecordCount);
                return new MigrateDatabaseResponse
                {
                    Success = false,
                    Message = $"Target database already contains {targetRecordCount} records. Migration aborted to prevent data loss. Please use an empty target database.",
                    Error = "Target database is not empty - will not overwrite existing data"
                };
            }

            // Migrate data from source to target (source data is NEVER modified or deleted)
            response.RecordsMigrated = await MigrateDataAsync(_context, targetContext);

            response.Success = true;
            response.Message = $"Successfully migrated {response.RecordsMigrated} records to {request.TargetProvider}";

            _logger.LogInformation("Database migration completed: {RecordsMigrated} records migrated", response.RecordsMigrated);

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error migrating database");
            return new MigrateDatabaseResponse
            {
                Success = false,
                Message = "Migration failed",
                Error = ex.Message
            };
        }
    }

    public async Task<DatabaseConfigurationDto> GetCurrentConfigurationAsync()
    {
        var provider = _configuration.GetValue<string>("DatabaseProvider") ?? "SQLite";

        var config = new DatabaseConfigurationDto
        {
            Id = 1,
            Provider = provider,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (provider.Equals("SQLite", StringComparison.OrdinalIgnoreCase))
        {
            config.SQLitePath = _configuration.GetConnectionString("SQLiteConnection")
                ?? "Data Source=servicesdashboard.db";
        }
        else
        {
            var connString = _configuration.GetConnectionString("DefaultConnection") ?? "";
            // Parse PostgreSQL connection string
            var builder = new NpgsqlConnectionStringBuilder(connString);
            config.PostgreSQLHost = builder.Host;
            config.PostgreSQLPort = builder.Port;
            config.PostgreSQLDatabase = builder.Database;
            config.PostgreSQLUsername = builder.Username;
        }

        return config;
    }

    public async Task<bool> SaveConfigurationAsync(UpdateDatabaseConfigurationRequest request)
    {
        try
        {
            // Save configuration to appsettings.json or environment
            // This would require writing to appsettings.json which is complex
            // Better to use environment variables or a separate config file

            _logger.LogWarning("Configuration saving not fully implemented - requires restart with environment variables");
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving database configuration");
            return false;
        }
    }

    // Private helper methods

    private async Task<TestDatabaseConnectionResponse> TestSQLiteConnectionAsync(string? path)
    {
        try
        {
            var connectionString = $"Data Source={path ?? "test.db"}";
            using var connection = new SqliteConnection(connectionString);
            await connection.OpenAsync();
            await connection.CloseAsync();

            return new TestDatabaseConnectionResponse
            {
                Success = true,
                Message = "SQLite connection successful"
            };
        }
        catch (Exception ex)
        {
            return new TestDatabaseConnectionResponse
            {
                Success = false,
                Message = "SQLite connection failed",
                Error = ex.Message
            };
        }
    }

    private async Task<TestDatabaseConnectionResponse> TestPostgreSQLConnectionAsync(
        string? host, int port, string? database, string? username, string? password)
    {
        try
        {
            var connectionString = BuildPostgreSQLConnectionString(host, port, database, username, password);
            using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync();
            await connection.CloseAsync();

            return new TestDatabaseConnectionResponse
            {
                Success = true,
                Message = "PostgreSQL connection successful"
            };
        }
        catch (Exception ex)
        {
            return new TestDatabaseConnectionResponse
            {
                Success = false,
                Message = "PostgreSQL connection failed",
                Error = ex.Message
            };
        }
    }

    private string BuildPostgreSQLConnectionString(
        string? host, int port, string? database, string? username, string? password)
    {
        return $"Host={host ?? "localhost"};Port={port};Database={database ?? "servicesdashboard"};Username={username ?? "admin"};Password={password}";
    }

    private async Task<int> CountTablesAsync(ServicesDashboardContext? context = null)
    {
        var ctx = context ?? _context;
        try
        {
            // Count entity tables
            int count = 0;
            if (await ctx.ManagedServers.AnyAsync() || !await ctx.ManagedServers.AnyAsync()) count++;
            if (await ctx.ServerHealthChecks.AnyAsync() || !await ctx.ServerHealthChecks.AnyAsync()) count++;
            // Add more tables as needed
            return count;
        }
        catch
        {
            return 0;
        }
    }

    private async Task<int> CountTotalRecordsAsync(ServicesDashboardContext? context = null)
    {
        var ctx = context ?? _context;
        try
        {
            int total = 0;
            total += await ctx.ManagedServers.CountAsync();
            total += await ctx.ServerHealthChecks.CountAsync();
            total += await ctx.UpdateReports.CountAsync();
            total += await ctx.StoredDiscoveredServices.CountAsync();
            total += await ctx.ServerAlerts.CountAsync();
            total += await ctx.ApplicationSettings.CountAsync();
            total += await ctx.DockerServiceArrangements.CountAsync();
            total += await ctx.ScheduledTasks.CountAsync();
            total += await ctx.SshCredentials.CountAsync();
            total += await ctx.GitProviderConnections.CountAsync();
            return total;
        }
        catch
        {
            return 0;
        }
    }

    private async Task ClearDatabaseAsync(ServicesDashboardContext context)
    {
        try
        {
            // Clear data in order that respects foreign key constraints
            // Delete in reverse order of dependencies

            await context.Database.ExecuteSqlRawAsync("DELETE FROM \"ServerHealthChecks\"");
            await context.Database.ExecuteSqlRawAsync("DELETE FROM \"UpdateReports\"");
            await context.Database.ExecuteSqlRawAsync("DELETE FROM \"ServerAlerts\"");
            await context.Database.ExecuteSqlRawAsync("DELETE FROM \"DockerServiceArrangements\"");
            await context.Database.ExecuteSqlRawAsync("DELETE FROM \"ScheduledTaskServers\"");
            await context.Database.ExecuteSqlRawAsync("DELETE FROM \"ScheduledTasks\"");
            await context.Database.ExecuteSqlRawAsync("DELETE FROM \"ManagedServers\"");
            await context.Database.ExecuteSqlRawAsync("DELETE FROM \"ApplicationSettings\"");
            await context.Database.ExecuteSqlRawAsync("DELETE FROM \"StoredDiscoveredServices\"");
            await context.Database.ExecuteSqlRawAsync("DELETE FROM \"SshCredentials\"");
            await context.Database.ExecuteSqlRawAsync("DELETE FROM \"GitProviders\"");

            _logger.LogInformation("Successfully cleared target database");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error clearing database, continuing anyway...");
            // Don't throw - we'll try to migrate anyway
        }
    }

    private async Task<int> MigrateDataAsync(
        ServicesDashboardContext sourceContext,
        ServicesDashboardContext targetContext)
    {
        int totalMigrated = 0;

        try
        {
            _logger.LogInformation("Starting data migration - source data will NOT be modified");

            // Migrate SSH Credentials first (referenced by ManagedServers)
            var credentials = await sourceContext.SshCredentials.ToListAsync();
            if (credentials.Any())
            {
                targetContext.SshCredentials.AddRange(credentials);
                await targetContext.SaveChangesAsync();
                totalMigrated += credentials.Count;
                _logger.LogInformation($"Migrated {credentials.Count} SSH credentials");
            }

            // Migrate ManagedServers
            var servers = await sourceContext.ManagedServers.ToListAsync();
            if (servers.Any())
            {
                targetContext.ManagedServers.AddRange(servers);
                await targetContext.SaveChangesAsync();
                totalMigrated += servers.Count;
                _logger.LogInformation($"Migrated {servers.Count} managed servers");
            }

            // Migrate ApplicationSettings
            var settings = await sourceContext.ApplicationSettings.ToListAsync();
            if (settings.Any())
            {
                targetContext.ApplicationSettings.AddRange(settings);
                await targetContext.SaveChangesAsync();
                totalMigrated += settings.Count;
                _logger.LogInformation($"Migrated {settings.Count} application settings");
            }

            // Migrate DockerServiceArrangements
            var arrangements = await sourceContext.DockerServiceArrangements.ToListAsync();
            if (arrangements.Any())
            {
                targetContext.DockerServiceArrangements.AddRange(arrangements);
                await targetContext.SaveChangesAsync();
                totalMigrated += arrangements.Count;
                _logger.LogInformation($"Migrated {arrangements.Count} docker service arrangements");
            }

            // Migrate ScheduledTasks
            var tasks = await sourceContext.ScheduledTasks.ToListAsync();
            if (tasks.Any())
            {
                targetContext.ScheduledTasks.AddRange(tasks);
                await targetContext.SaveChangesAsync();
                totalMigrated += tasks.Count;
                _logger.LogInformation($"Migrated {tasks.Count} scheduled tasks");
            }

            // Migrate StoredDiscoveredServices
            var discoveredServices = await sourceContext.StoredDiscoveredServices.ToListAsync();
            if (discoveredServices.Any())
            {
                targetContext.StoredDiscoveredServices.AddRange(discoveredServices);
                await targetContext.SaveChangesAsync();
                totalMigrated += discoveredServices.Count;
                _logger.LogInformation($"Migrated {discoveredServices.Count} discovered services");
            }

            // Migrate Git Provider Connections
            var gitProviders = await sourceContext.GitProviderConnections.ToListAsync();
            if (gitProviders.Any())
            {
                targetContext.GitProviderConnections.AddRange(gitProviders);
                await targetContext.SaveChangesAsync();
                totalMigrated += gitProviders.Count;
                _logger.LogInformation($"Migrated {gitProviders.Count} git provider connections");
            }

            // Migrate ServerHealthChecks
            var healthChecks = await sourceContext.ServerHealthChecks.ToListAsync();
            if (healthChecks.Any())
            {
                targetContext.ServerHealthChecks.AddRange(healthChecks);
                await targetContext.SaveChangesAsync();
                totalMigrated += healthChecks.Count;
                _logger.LogInformation($"Migrated {healthChecks.Count} health checks");
            }

            // Migrate UpdateReports
            var updateReports = await sourceContext.UpdateReports.ToListAsync();
            if (updateReports.Any())
            {
                targetContext.UpdateReports.AddRange(updateReports);
                await targetContext.SaveChangesAsync();
                totalMigrated += updateReports.Count;
                _logger.LogInformation($"Migrated {updateReports.Count} update reports");
            }

            // Migrate ServerAlerts
            var alerts = await sourceContext.ServerAlerts.ToListAsync();
            if (alerts.Any())
            {
                targetContext.ServerAlerts.AddRange(alerts);
                await targetContext.SaveChangesAsync();
                totalMigrated += alerts.Count;
                _logger.LogInformation($"Migrated {alerts.Count} server alerts");
            }

            _logger.LogInformation($"Migration complete - {totalMigrated} total records migrated. Source database unchanged.");

            return totalMigrated;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during data migration - source database remains unchanged");
            throw;
        }
    }

    private long? GetSQLiteDatabaseSize()
    {
        try
        {
            var path = _configuration.GetConnectionString("SQLiteConnection")
                ?? "Data Source=servicesdashboard.db";

            // Extract file path from connection string
            var parts = path.Split('=');
            if (parts.Length > 1)
            {
                var filePath = parts[1].Trim();
                if (File.Exists(filePath))
                {
                    var fileInfo = new FileInfo(filePath);
                    return fileInfo.Length / (1024 * 1024); // Convert to MB
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting SQLite database size");
        }

        return null;
    }

    private string MaskConnectionString(string connectionString)
    {
        // Mask sensitive information in connection string
        return System.Text.RegularExpressions.Regex.Replace(
            connectionString,
            @"(Password|Pwd)=([^;]+)",
            "$1=***",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);
    }
}
