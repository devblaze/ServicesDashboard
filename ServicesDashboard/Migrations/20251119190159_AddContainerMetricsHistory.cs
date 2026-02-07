using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ServicesDashboard.Migrations
{
    /// <inheritdoc />
    public partial class AddContainerMetricsHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ContainerMetricsHistory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ServerId = table.Column<int>(type: "integer", nullable: false),
                    ContainerId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ContainerName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    CpuPercentage = table.Column<float>(type: "real", nullable: false),
                    MemoryUsageBytes = table.Column<long>(type: "bigint", nullable: false),
                    MemoryPercentage = table.Column<float>(type: "real", nullable: false),
                    MemoryLimitBytes = table.Column<long>(type: "bigint", nullable: false),
                    NetworkRxBytes = table.Column<long>(type: "bigint", nullable: false),
                    NetworkTxBytes = table.Column<long>(type: "bigint", nullable: false),
                    BlockReadBytes = table.Column<long>(type: "bigint", nullable: false),
                    BlockWriteBytes = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContainerMetricsHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContainerMetricsHistory_ManagedServers_ServerId",
                        column: x => x.ServerId,
                        principalTable: "ManagedServers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ContainerMetricsHistory_ServerId_ContainerId_Timestamp",
                table: "ContainerMetricsHistory",
                columns: new[] { "ServerId", "ContainerId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_ContainerMetricsHistory_ServerId_Timestamp",
                table: "ContainerMetricsHistory",
                columns: new[] { "ServerId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_ContainerMetricsHistory_Timestamp",
                table: "ContainerMetricsHistory",
                column: "Timestamp");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContainerMetricsHistory");
        }
    }
}
