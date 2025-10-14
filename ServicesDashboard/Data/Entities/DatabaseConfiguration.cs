using System.ComponentModel.DataAnnotations;

namespace ServicesDashboard.Data.Entities;

public class DatabaseConfiguration
{
    public int Id { get; set; }

    [Required]
    public DatabaseProvider Provider { get; set; } = DatabaseProvider.SQLite;

    // SQLite settings
    public string? SQLitePath { get; set; }

    // PostgreSQL settings
    public string? PostgreSQLHost { get; set; }
    public int PostgreSQLPort { get; set; } = 5432;
    public string? PostgreSQLDatabase { get; set; }
    public string? PostgreSQLUsername { get; set; }
    public string? PostgreSQLPassword { get; set; } // Encrypted in practice

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public enum DatabaseProvider
{
    SQLite = 0,
    PostgreSQL = 1
}
