using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ServicesDashboard.Migrations
{
    /// <inheritdoc />
    public partial class AddScheduledTasksFeature : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ScheduledTasks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Command = table.Column<string>(type: "text", nullable: false),
                    CronExpression = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TimeZone = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    TimeoutSeconds = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    LastExecutionTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    NextExecutionTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScheduledTasks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ScheduledTaskServers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ScheduledTaskId = table.Column<int>(type: "integer", nullable: false),
                    ServerId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScheduledTaskServers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScheduledTaskServers_ManagedServers_ServerId",
                        column: x => x.ServerId,
                        principalTable: "ManagedServers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ScheduledTaskServers_ScheduledTasks_ScheduledTaskId",
                        column: x => x.ScheduledTaskId,
                        principalTable: "ScheduledTasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TaskExecutions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ScheduledTaskId = table.Column<int>(type: "integer", nullable: false),
                    ServerId = table.Column<int>(type: "integer", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Output = table.Column<string>(type: "text", nullable: true),
                    ErrorOutput = table.Column<string>(type: "text", nullable: true),
                    ExitCode = table.Column<int>(type: "integer", nullable: true),
                    DurationMs = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskExecutions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TaskExecutions_ManagedServers_ServerId",
                        column: x => x.ServerId,
                        principalTable: "ManagedServers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TaskExecutions_ScheduledTasks_ScheduledTaskId",
                        column: x => x.ScheduledTaskId,
                        principalTable: "ScheduledTasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ScheduledTasks_IsEnabled",
                table: "ScheduledTasks",
                column: "IsEnabled");

            migrationBuilder.CreateIndex(
                name: "IX_ScheduledTasks_NextExecutionTime",
                table: "ScheduledTasks",
                column: "NextExecutionTime");

            migrationBuilder.CreateIndex(
                name: "IX_ScheduledTaskServers_ScheduledTaskId_ServerId",
                table: "ScheduledTaskServers",
                columns: new[] { "ScheduledTaskId", "ServerId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ScheduledTaskServers_ServerId",
                table: "ScheduledTaskServers",
                column: "ServerId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskExecutions_ScheduledTaskId_StartedAt",
                table: "TaskExecutions",
                columns: new[] { "ScheduledTaskId", "StartedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_TaskExecutions_ServerId_StartedAt",
                table: "TaskExecutions",
                columns: new[] { "ServerId", "StartedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_TaskExecutions_StartedAt",
                table: "TaskExecutions",
                column: "StartedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ScheduledTaskServers");

            migrationBuilder.DropTable(
                name: "TaskExecutions");

            migrationBuilder.DropTable(
                name: "ScheduledTasks");
        }
    }
}
