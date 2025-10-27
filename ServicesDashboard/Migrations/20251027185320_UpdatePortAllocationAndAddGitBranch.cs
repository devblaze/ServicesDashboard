using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ServicesDashboard.Migrations
{
    /// <inheritdoc />
    public partial class UpdatePortAllocationAndAddGitBranch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PortAllocations_Deployments_DeploymentId",
                table: "PortAllocations");

            migrationBuilder.DropIndex(
                name: "IX_PortAllocations_ServerId_Port",
                table: "PortAllocations");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "PortAllocations");

            migrationBuilder.AlterColumn<string>(
                name: "ServiceName",
                table: "PortAllocations",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "DeploymentId",
                table: "PortAllocations",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<DateTime>(
                name: "AllocatedAt",
                table: "PortAllocations",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AddColumn<string>(
                name: "AllocationType",
                table: "PortAllocations",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "PortAllocations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AddColumn<DateTime>(
                name: "ReleasedAt",
                table: "PortAllocations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ServiceId",
                table: "PortAllocations",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "PortAllocations",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "PortAllocations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.CreateTable(
                name: "GitBranches",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RepositoryId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CommitSha = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    HasAutoDeployment = table.Column<bool>(type: "boolean", nullable: false),
                    DeploymentId = table.Column<int>(type: "integer", nullable: true),
                    LastCommitAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DetectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GitBranches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GitBranches_Deployments_DeploymentId",
                        column: x => x.DeploymentId,
                        principalTable: "Deployments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_GitBranches_GitRepositories_RepositoryId",
                        column: x => x.RepositoryId,
                        principalTable: "GitRepositories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PortAllocations_ServerId_Port_Status",
                table: "PortAllocations",
                columns: new[] { "ServerId", "Port", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_PortAllocations_ServiceId",
                table: "PortAllocations",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_GitBranches_DeploymentId",
                table: "GitBranches",
                column: "DeploymentId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GitBranches_HasAutoDeployment",
                table: "GitBranches",
                column: "HasAutoDeployment");

            migrationBuilder.CreateIndex(
                name: "IX_GitBranches_RepositoryId_Name",
                table: "GitBranches",
                columns: new[] { "RepositoryId", "Name" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_PortAllocations_Deployments_DeploymentId",
                table: "PortAllocations",
                column: "DeploymentId",
                principalTable: "Deployments",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PortAllocations_Deployments_DeploymentId",
                table: "PortAllocations");

            migrationBuilder.DropTable(
                name: "GitBranches");

            migrationBuilder.DropIndex(
                name: "IX_PortAllocations_ServerId_Port_Status",
                table: "PortAllocations");

            migrationBuilder.DropIndex(
                name: "IX_PortAllocations_ServiceId",
                table: "PortAllocations");

            migrationBuilder.DropColumn(
                name: "AllocationType",
                table: "PortAllocations");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "PortAllocations");

            migrationBuilder.DropColumn(
                name: "ReleasedAt",
                table: "PortAllocations");

            migrationBuilder.DropColumn(
                name: "ServiceId",
                table: "PortAllocations");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "PortAllocations");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "PortAllocations");

            migrationBuilder.AlterColumn<string>(
                name: "ServiceName",
                table: "PortAllocations",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200,
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "DeploymentId",
                table: "PortAllocations",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "AllocatedAt",
                table: "PortAllocations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "PortAllocations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_PortAllocations_ServerId_Port",
                table: "PortAllocations",
                columns: new[] { "ServerId", "Port" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_PortAllocations_Deployments_DeploymentId",
                table: "PortAllocations",
                column: "DeploymentId",
                principalTable: "Deployments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
