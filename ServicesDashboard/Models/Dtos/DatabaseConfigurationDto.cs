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
    public string? SQLitePath { get; set; }
    public string? PostgreSQLHost { get; set; }
    public int PostgreSQLPort { get; set; } = 5432;
    public string? PostgreSQLDatabase { get; set; }
    public string? PostgreSQLUsername { get; set; }
    public string? PostgreSQLPassword { get; set; }
}

public class TestDatabaseConnectionResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Error { get; set; }
}

public class MigrateDatabaseRequest
{
    public string TargetProvider { get; set; } = "PostgreSQL";
    public string? PostgreSQLHost { get; set; }
    public int PostgreSQLPort { get; set; } = 5432;
    public string? PostgreSQLDatabase { get; set; }
    public string? PostgreSQLUsername { get; set; }
    public string? PostgreSQLPassword { get; set; }
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
