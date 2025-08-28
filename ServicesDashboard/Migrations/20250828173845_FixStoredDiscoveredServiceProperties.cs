using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServicesDashboard.Migrations
{
    /// <inheritdoc />
    public partial class FixStoredDiscoveredServiceProperties : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_StoredDiscoveredServices_NetworkScanSessions_ScanSessionId",
                table: "StoredDiscoveredServices");

            migrationBuilder.DropIndex(
                name: "IX_StoredDiscoveredServices_LastSeenAt",
                table: "StoredDiscoveredServices");

            migrationBuilder.DropColumn(
                name: "LastSeenAt",
                table: "StoredDiscoveredServices");

            migrationBuilder.DropColumn(
                name: "ResponseTime",
                table: "StoredDiscoveredServices");

            migrationBuilder.RenameColumn(
                name: "ScanSessionId",
                table: "StoredDiscoveredServices",
                newName: "ScanId");

            migrationBuilder.RenameIndex(
                name: "IX_StoredDiscoveredServices_ScanSessionId",
                table: "StoredDiscoveredServices",
                newName: "IX_StoredDiscoveredServices_ScanId");

            migrationBuilder.AddColumn<double>(
                name: "AiConfidence",
                table: "StoredDiscoveredServices",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RecognizedName",
                table: "StoredDiscoveredServices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "ResponseTimeMs",
                table: "StoredDiscoveredServices",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<string>(
                name: "ServiceCategory",
                table: "StoredDiscoveredServices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SuggestedDescription",
                table: "StoredDiscoveredServices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SuggestedIcon",
                table: "StoredDiscoveredServices",
                type: "text",
                nullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "LastChecked",
                table: "HostedServices",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "DateAdded",
                table: "HostedServices",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AddColumn<string>(
                name: "Metadata",
                table: "HostedServices",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_StoredDiscoveredServices_DiscoveredAt",
                table: "StoredDiscoveredServices",
                column: "DiscoveredAt");

            migrationBuilder.AddForeignKey(
                name: "FK_StoredDiscoveredServices_NetworkScanSessions_ScanId",
                table: "StoredDiscoveredServices",
                column: "ScanId",
                principalTable: "NetworkScanSessions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_StoredDiscoveredServices_NetworkScanSessions_ScanId",
                table: "StoredDiscoveredServices");

            migrationBuilder.DropIndex(
                name: "IX_StoredDiscoveredServices_DiscoveredAt",
                table: "StoredDiscoveredServices");

            migrationBuilder.DropColumn(
                name: "AiConfidence",
                table: "StoredDiscoveredServices");

            migrationBuilder.DropColumn(
                name: "RecognizedName",
                table: "StoredDiscoveredServices");

            migrationBuilder.DropColumn(
                name: "ResponseTimeMs",
                table: "StoredDiscoveredServices");

            migrationBuilder.DropColumn(
                name: "ServiceCategory",
                table: "StoredDiscoveredServices");

            migrationBuilder.DropColumn(
                name: "SuggestedDescription",
                table: "StoredDiscoveredServices");

            migrationBuilder.DropColumn(
                name: "SuggestedIcon",
                table: "StoredDiscoveredServices");

            migrationBuilder.DropColumn(
                name: "Metadata",
                table: "HostedServices");

            migrationBuilder.RenameColumn(
                name: "ScanId",
                table: "StoredDiscoveredServices",
                newName: "ScanSessionId");

            migrationBuilder.RenameIndex(
                name: "IX_StoredDiscoveredServices_ScanId",
                table: "StoredDiscoveredServices",
                newName: "IX_StoredDiscoveredServices_ScanSessionId");

            migrationBuilder.AddColumn<DateTime>(
                name: "LastSeenAt",
                table: "StoredDiscoveredServices",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AddColumn<TimeSpan>(
                name: "ResponseTime",
                table: "StoredDiscoveredServices",
                type: "interval",
                nullable: false,
                defaultValue: new TimeSpan(0, 0, 0, 0, 0));

            migrationBuilder.AlterColumn<DateTime>(
                name: "LastChecked",
                table: "HostedServices",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AlterColumn<DateTime>(
                name: "DateAdded",
                table: "HostedServices",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.CreateIndex(
                name: "IX_StoredDiscoveredServices_LastSeenAt",
                table: "StoredDiscoveredServices",
                column: "LastSeenAt");

            migrationBuilder.AddForeignKey(
                name: "FK_StoredDiscoveredServices_NetworkScanSessions_ScanSessionId",
                table: "StoredDiscoveredServices",
                column: "ScanSessionId",
                principalTable: "NetworkScanSessions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
