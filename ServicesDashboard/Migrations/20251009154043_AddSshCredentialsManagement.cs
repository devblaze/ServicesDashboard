using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ServicesDashboard.Migrations
{
    /// <inheritdoc />
    public partial class AddSshCredentialsManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SshCredentialId",
                table: "ManagedServers",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SshCredentials",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Username = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Password = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    DefaultPort = table.Column<int>(type: "integer", nullable: true),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SshCredentials", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ManagedServers_SshCredentialId",
                table: "ManagedServers",
                column: "SshCredentialId");

            migrationBuilder.CreateIndex(
                name: "IX_SshCredentials_Name",
                table: "SshCredentials",
                column: "Name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_ManagedServers_SshCredentials_SshCredentialId",
                table: "ManagedServers",
                column: "SshCredentialId",
                principalTable: "SshCredentials",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ManagedServers_SshCredentials_SshCredentialId",
                table: "ManagedServers");

            migrationBuilder.DropTable(
                name: "SshCredentials");

            migrationBuilder.DropIndex(
                name: "IX_ManagedServers_SshCredentialId",
                table: "ManagedServers");

            migrationBuilder.DropColumn(
                name: "SshCredentialId",
                table: "ManagedServers");
        }
    }
}
