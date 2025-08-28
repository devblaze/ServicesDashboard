using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServicesDashboard.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceKeyToStoredDiscoveredService : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ServiceKey",
                table: "StoredDiscoveredServices",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_StoredDiscoveredServices_ServiceKey",
                table: "StoredDiscoveredServices",
                column: "ServiceKey");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_StoredDiscoveredServices_ServiceKey",
                table: "StoredDiscoveredServices");

            migrationBuilder.DropColumn(
                name: "ServiceKey",
                table: "StoredDiscoveredServices");
        }
    }
}
