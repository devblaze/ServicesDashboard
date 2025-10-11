using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServicesDashboard.Migrations
{
    /// <inheritdoc />
    public partial class AddServerParentChildRelationship : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ParentServerId",
                table: "ManagedServers",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ManagedServers_ParentServerId",
                table: "ManagedServers",
                column: "ParentServerId");

            migrationBuilder.AddForeignKey(
                name: "FK_ManagedServers_ManagedServers_ParentServerId",
                table: "ManagedServers",
                column: "ParentServerId",
                principalTable: "ManagedServers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ManagedServers_ManagedServers_ParentServerId",
                table: "ManagedServers");

            migrationBuilder.DropIndex(
                name: "IX_ManagedServers_ParentServerId",
                table: "ManagedServers");

            migrationBuilder.DropColumn(
                name: "ParentServerId",
                table: "ManagedServers");
        }
    }
}
