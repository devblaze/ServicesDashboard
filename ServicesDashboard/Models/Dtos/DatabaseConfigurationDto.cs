namespace ServicesDashboard.Models.Dtos;

public class DatabaseConfigurationDto
{
    public int Id { get; set; }
    public string Provider { get; set; } = "SQLite";

    // SQLite settings
    public string? SQLitePath { get; set; }

    // PostgreSQL settings
    public string? PostgreSQLHost { get; set; }
    public int PostgreSQLPort { get; set; } = 5432;
    public string? PostgreSQLDatabase { get; set; }
    public string? PostgreSQLUsername { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UpdateDatabaseConfigurationRequest
{
    public string Provider { get; set; } = "SQLite";

    // SQLite settings
    public string? SQLitePath { get; set; }

    // PostgreSQL settings
    public string? PostgreSQLHost { get; set; }
    public int PostgreSQLPort { get; set; } = 5432;
    public string? PostgreSQLDatabase { get; set; }
    public string? PostgreSQLUsername { get; set; }
    public string? PostgreSQLPassword { get; set; }
}

public class TestDatabaseConnectionRequest
{
    public string Provider { get; set; } = "SQLite";

    // SQLite settings
    public string? SQLitePath { get; set; }

    // PostgreSQL settings
    public string? PostgreSQLHost { get; set; }
    public int PostgreSQLPort { get; set; } = 5432;
    public string? PostgreSQLDatabase { get; set; }
    public string? PostgreSQLUsername { get; set; }
    public string? PostgreSQLPassword { get; set; }

    // SQL Server settings
    public string? SqlServerHost { get; set; }
    public int? SqlServerPort { get; set; } = 1433;
    public string? SqlServerDatabase { get; set; }
    public string? SqlServerUsername { get; set; }
    public string? SqlServerPassword { get; set; }
}

public class TestDatabaseConnectionResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Error { get; set; }
    public string? ServerVersion { get; set; }
    public int? ResponseTimeMs { get; set; }
}

public class MigrateDatabaseRequest
{
    public string TargetProvider { get; set; } = "PostgreSQL";

    // PostgreSQL settings
    public string? PostgreSQLHost { get; set; }
    public int PostgreSQLPort { get; set; } = 5432;
    public string? PostgreSQLDatabase { get; set; }
    public string? PostgreSQLUsername { get; set; }
    public string? PostgreSQLPassword { get; set; }

    // SQL Server settings
    public string? SqlServerHost { get; set; }
    public int? SqlServerPort { get; set; } = 1433;
    public string? SqlServerDatabase { get; set; }
    public string? SqlServerUsername { get; set; }
    public string? SqlServerPassword { get; set; }
}

public class MigrateDatabaseResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int TablesCreated { get; set; }
    public int RecordsMigrated { get; set; }
    public string? Error { get; set; }
}

public class DatabaseStatusResponse
{
    public string Provider { get; set; } = "SQLite";
    public bool IsConnected { get; set; }
    public string ConnectionString { get; set; } = string.Empty;
    public long? DatabaseSizeMB { get; set; }
    public int TotalTables { get; set; }
    public int TotalRecords { get; set; }
    public bool RequiresSetup { get; set; }
}

public class DatabaseExportResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Error { get; set; }
    public string? FileName { get; set; }
    public DatabaseExportData? Data { get; set; }
    public DatabaseExportMetadata? Metadata { get; set; }
}

public class DatabaseExportMetadata
{
    public string ExportedAt { get; set; } = string.Empty;
    public string SourceProvider { get; set; } = string.Empty;
    public string AppVersion { get; set; } = string.Empty;
    public int TotalRecords { get; set; }
    public Dictionary<string, int> TableCounts { get; set; } = new();
}

public class DatabaseExportData
{
    public List<object> ManagedServers { get; set; } = new();
    public List<object> SshCredentials { get; set; } = new();
    public List<object> ApplicationSettings { get; set; } = new();
    public List<object> DockerServiceArrangements { get; set; } = new();
    public List<object> ScheduledTasks { get; set; } = new();
    public List<object> StoredDiscoveredServices { get; set; } = new();
    public List<object> GitProviderConnections { get; set; } = new();
    public List<object> ServerHealthChecks { get; set; } = new();
    public List<object> UpdateReports { get; set; } = new();
    public List<object> ServerAlerts { get; set; } = new();
}

public class DatabaseImportRequest
{
    public DatabaseExportData Data { get; set; } = new();
    public DatabaseExportMetadata Metadata { get; set; } = new();
    public bool ClearExistingData { get; set; } = false;
}

public class DatabaseImportResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Error { get; set; }
    public int RecordsImported { get; set; }
    public Dictionary<string, int> TableCounts { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
}

// Remote Sync DTOs
public class GenerateSyncTokenResponse
{
    public bool Success { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public string Message { get; set; } = string.Empty;
    public int TotalRecords { get; set; }
}

public class RemoteSyncRequest
{
    public string SourceUrl { get; set; } = string.Empty;
    public string SyncToken { get; set; } = string.Empty;
    public bool ClearExistingData { get; set; } = false;
}

public class RemoteSyncResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Error { get; set; }
    public int RecordsSynced { get; set; }
    public string? SourceProvider { get; set; }
    public Dictionary<string, int> TableCounts { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
}

public class ValidateSyncTokenRequest
{
    public string Token { get; set; } = string.Empty;
}
