using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ServicesDashboard.Migrations
{
    /// <inheritdoc />
    public partial class FixOllamaSettingsEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "HostedServices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Url = table.Column<string>(type: "text", nullable: false),
                    ContainerId = table.Column<string>(type: "text", nullable: false),
                    IsDockerContainer = table.Column<bool>(type: "boolean", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    LastChecked = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DateAdded = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HostedServices", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ManagedServers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    HostAddress = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    SshPort = table.Column<int>(type: "integer", nullable: true),
                    Username = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    EncryptedPassword = table.Column<string>(type: "text", nullable: true),
                    SshKeyPath = table.Column<string>(type: "text", nullable: true),
                    Type = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    OperatingSystem = table.Column<string>(type: "text", nullable: true),
                    SystemInfo = table.Column<string>(type: "text", nullable: true),
                    LastCheckTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    Tags = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ManagedServers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OllamaSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    BaseUrl = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Model = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    EnableServiceRecognition = table.Column<bool>(type: "boolean", nullable: false),
                    EnableScreenshots = table.Column<bool>(type: "boolean", nullable: false),
                    TimeoutSeconds = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OllamaSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ServerAlerts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ServerId = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    Type = table.Column<string>(type: "text", nullable: false),
                    Severity = table.Column<string>(type: "text", nullable: false),
                    Message = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Details = table.Column<string>(type: "text", nullable: true),
                    IsResolved = table.Column<bool>(type: "boolean", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Resolution = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServerAlerts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ServerAlerts_ManagedServers_ServerId",
                        column: x => x.ServerId,
                        principalTable: "ManagedServers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ServerHealthChecks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ServerId = table.Column<int>(type: "integer", nullable: false),
                    CheckTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    IsHealthy = table.Column<bool>(type: "boolean", nullable: false),
                    CpuUsage = table.Column<double>(type: "double precision", nullable: true),
                    MemoryUsage = table.Column<double>(type: "double precision", nullable: true),
                    DiskUsage = table.Column<double>(type: "double precision", nullable: true),
                    LoadAverage = table.Column<double>(type: "double precision", nullable: true),
                    RunningProcesses = table.Column<int>(type: "integer", nullable: true),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    RawData = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServerHealthChecks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ServerHealthChecks_ManagedServers_ServerId",
                        column: x => x.ServerId,
                        principalTable: "ManagedServers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UpdateReports",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ServerId = table.Column<int>(type: "integer", nullable: false),
                    ScanTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    AvailableUpdates = table.Column<int>(type: "integer", nullable: false),
                    SecurityUpdates = table.Column<int>(type: "integer", nullable: false),
                    PackageDetails = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    AiRecommendation = table.Column<string>(type: "text", nullable: true),
                    AiConfidence = table.Column<double>(type: "double precision", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UpdateReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UpdateReports_ManagedServers_ServerId",
                        column: x => x.ServerId,
                        principalTable: "ManagedServers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ManagedServers_HostAddress",
                table: "ManagedServers",
                column: "HostAddress",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ServerAlerts_ServerId_IsResolved",
                table: "ServerAlerts",
                columns: new[] { "ServerId", "IsResolved" });

            migrationBuilder.CreateIndex(
                name: "IX_ServerHealthChecks_CheckTime",
                table: "ServerHealthChecks",
                column: "CheckTime");

            migrationBuilder.CreateIndex(
                name: "IX_ServerHealthChecks_ServerId",
                table: "ServerHealthChecks",
                column: "ServerId");

            migrationBuilder.CreateIndex(
                name: "IX_UpdateReports_ScanTime",
                table: "UpdateReports",
                column: "ScanTime");

            migrationBuilder.CreateIndex(
                name: "IX_UpdateReports_ServerId",
                table: "UpdateReports",
                column: "ServerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HostedServices");

            migrationBuilder.DropTable(
                name: "OllamaSettings");

            migrationBuilder.DropTable(
                name: "ServerAlerts");

            migrationBuilder.DropTable(
                name: "ServerHealthChecks");

            migrationBuilder.DropTable(
                name: "UpdateReports");

            migrationBuilder.DropTable(
                name: "ManagedServers");
        }
    }
}
