using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ServicesDashboard.Migrations
{
    /// <inheritdoc />
    public partial class AddVMOperations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CloudImages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OsType = table.Column<string>(type: "text", nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    DownloadUrl = table.Column<string>(type: "text", nullable: false),
                    FileName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Checksum = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    ChecksumType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: true),
                    Version = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    IsDownloaded = table.Column<bool>(type: "boolean", nullable: false),
                    LastDownloadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastCheckedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CloudImages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VMOperations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OperationId = table.Column<Guid>(type: "uuid", nullable: false),
                    HostServerId = table.Column<int>(type: "integer", nullable: false),
                    CreatedServerId = table.Column<int>(type: "integer", nullable: true),
                    VMName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    OperationType = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Preset = table.Column<string>(type: "text", nullable: false),
                    OsType = table.Column<string>(type: "text", nullable: false),
                    Username = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    EncryptedPassword = table.Column<string>(type: "text", nullable: true),
                    RamMb = table.Column<int>(type: "integer", nullable: false),
                    VCpus = table.Column<int>(type: "integer", nullable: false),
                    DiskSizeGb = table.Column<int>(type: "integer", nullable: false),
                    IpAddress = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    SshConnectionString = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    ProgressPercent = table.Column<int>(type: "integer", nullable: false),
                    CurrentStage = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    OperationLog = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VMOperations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VMOperations_ManagedServers_CreatedServerId",
                        column: x => x.CreatedServerId,
                        principalTable: "ManagedServers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_VMOperations_ManagedServers_HostServerId",
                        column: x => x.HostServerId,
                        principalTable: "ManagedServers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_CloudImages_OsType",
                table: "CloudImages",
                column: "OsType",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VMOperations_CreatedAt",
                table: "VMOperations",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_VMOperations_CreatedServerId",
                table: "VMOperations",
                column: "CreatedServerId");

            migrationBuilder.CreateIndex(
                name: "IX_VMOperations_HostServerId_Status",
                table: "VMOperations",
                columns: new[] { "HostServerId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_VMOperations_OperationId",
                table: "VMOperations",
                column: "OperationId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CloudImages");

            migrationBuilder.DropTable(
                name: "VMOperations");
        }
    }
}
