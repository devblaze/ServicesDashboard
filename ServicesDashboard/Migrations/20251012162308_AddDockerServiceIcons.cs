using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServicesDashboard.Migrations
{
    /// <inheritdoc />
    public partial class AddDockerServiceIcons : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CustomIconData",
                table: "DockerServiceArrangements",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomIconUrl",
                table: "DockerServiceArrangements",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomIconData",
                table: "DockerServiceArrangements");

            migrationBuilder.DropColumn(
                name: "CustomIconUrl",
                table: "DockerServiceArrangements");
        }
    }
}
