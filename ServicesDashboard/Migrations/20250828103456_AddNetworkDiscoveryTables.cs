using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ServicesDashboard.Migrations
{
    /// <inheritdoc />
    public partial class AddNetworkDiscoveryTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ServerId",
                table: "HostedServices",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "NetworkScanSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Target = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ScanType = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TotalHosts = table.Column<int>(type: "integer", nullable: false),
                    ScannedHosts = table.Column<int>(type: "integer", nullable: false),
                    TotalPorts = table.Column<int>(type: "integer", nullable: false),
                    ScannedPorts = table.Column<int>(type: "integer", nullable: false),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NetworkScanSessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StoredDiscoveredServices",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ScanSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    HostAddress = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    HostName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Port = table.Column<int>(type: "integer", nullable: false),
                    IsReachable = table.Column<bool>(type: "boolean", nullable: false),
                    ServiceType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Banner = table.Column<string>(type: "text", nullable: true),
                    ResponseTime = table.Column<TimeSpan>(type: "interval", nullable: false),
                    DiscoveredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    LastSeenAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoredDiscoveredServices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StoredDiscoveredServices_NetworkScanSessions_ScanSessionId",
                        column: x => x.ScanSessionId,
                        principalTable: "NetworkScanSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_HostedServices_ServerId",
                table: "HostedServices",
                column: "ServerId");

            migrationBuilder.CreateIndex(
                name: "IX_NetworkScanSessions_Target_StartedAt",
                table: "NetworkScanSessions",
                columns: new[] { "Target", "StartedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_StoredDiscoveredServices_HostAddress_Port",
                table: "StoredDiscoveredServices",
                columns: new[] { "HostAddress", "Port" });

            migrationBuilder.CreateIndex(
                name: "IX_StoredDiscoveredServices_LastSeenAt",
                table: "StoredDiscoveredServices",
                column: "LastSeenAt");

            migrationBuilder.CreateIndex(
                name: "IX_StoredDiscoveredServices_ScanSessionId",
                table: "StoredDiscoveredServices",
                column: "ScanSessionId");

            migrationBuilder.AddForeignKey(
                name: "FK_HostedServices_ManagedServers_ServerId",
                table: "HostedServices",
                column: "ServerId",
                principalTable: "ManagedServers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_HostedServices_ManagedServers_ServerId",
                table: "HostedServices");

            migrationBuilder.DropTable(
                name: "StoredDiscoveredServices");

            migrationBuilder.DropTable(
                name: "NetworkScanSessions");

            migrationBuilder.DropIndex(
                name: "IX_HostedServices_ServerId",
                table: "HostedServices");

            migrationBuilder.DropColumn(
                name: "ServerId",
                table: "HostedServices");
        }
    }
}
