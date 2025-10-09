using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ServicesDashboard.Migrations
{
    /// <inheritdoc />
    public partial class UpdateModelChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "ServiceType",
                table: "StoredDiscoveredServices",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.CreateTable(
                name: "DockerServiceArrangements",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ContainerId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ContainerName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ServerId = table.Column<int>(type: "integer", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DockerServiceArrangements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DockerServiceArrangements_ManagedServers_ServerId",
                        column: x => x.ServerId,
                        principalTable: "ManagedServers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StoredDiscoveredServices_HostAddress_Port_ServiceKey",
                table: "StoredDiscoveredServices",
                columns: new[] { "HostAddress", "Port", "ServiceKey" });

            migrationBuilder.CreateIndex(
                name: "IX_DockerServiceArrangements_Order",
                table: "DockerServiceArrangements",
                column: "Order");

            migrationBuilder.CreateIndex(
                name: "IX_DockerServiceArrangements_ServerId_ContainerId",
                table: "DockerServiceArrangements",
                columns: new[] { "ServerId", "ContainerId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DockerServiceArrangements");

            migrationBuilder.DropIndex(
                name: "IX_StoredDiscoveredServices_HostAddress_Port_ServiceKey",
                table: "StoredDiscoveredServices");

            migrationBuilder.AlterColumn<string>(
                name: "ServiceType",
                table: "StoredDiscoveredServices",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldNullable: true);
        }
    }
}
