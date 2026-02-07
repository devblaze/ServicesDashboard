using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ServicesDashboard.Migrations
{
    /// <inheritdoc />
    public partial class AddSystemMetrics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ContainerMetricsHistory_ManagedServers_ServerId",
                table: "ContainerMetricsHistory");

            migrationBuilder.DropForeignKey(
                name: "FK_DeploymentEnvironments_Deployments_DeploymentId",
                table: "DeploymentEnvironments");

            migrationBuilder.DropForeignKey(
                name: "FK_Deployments_GitRepositories_GitRepositoryId",
                table: "Deployments");

            migrationBuilder.DropForeignKey(
                name: "FK_Deployments_ManagedServers_ServerId",
                table: "Deployments");

            migrationBuilder.DropForeignKey(
                name: "FK_DeviceHistories_NetworkDevices_NetworkDeviceId",
                table: "DeviceHistories");

            migrationBuilder.DropForeignKey(
                name: "FK_DockerServiceArrangements_ManagedServers_ServerId",
                table: "DockerServiceArrangements");

            migrationBuilder.DropForeignKey(
                name: "FK_GitBranches_Deployments_DeploymentId",
                table: "GitBranches");

            migrationBuilder.DropForeignKey(
                name: "FK_GitBranches_GitRepositories_RepositoryId",
                table: "GitBranches");

            migrationBuilder.DropForeignKey(
                name: "FK_GitRepositories_GitProviderConnections_GitProviderConnectio~",
                table: "GitRepositories");

            migrationBuilder.DropForeignKey(
                name: "FK_IpReservations_NetworkDevices_NetworkDeviceId",
                table: "IpReservations");

            migrationBuilder.DropForeignKey(
                name: "FK_IpReservations_Subnets_SubnetId",
                table: "IpReservations");

            migrationBuilder.DropForeignKey(
                name: "FK_ManagedServers_ManagedServers_ParentServerId",
                table: "ManagedServers");

            migrationBuilder.DropForeignKey(
                name: "FK_NetworkDevices_ManagedServers_ManagedServerId",
                table: "NetworkDevices");

            migrationBuilder.DropForeignKey(
                name: "FK_NetworkDevices_Subnets_SubnetId",
                table: "NetworkDevices");

            migrationBuilder.DropForeignKey(
                name: "FK_PortAllocations_Deployments_DeploymentId",
                table: "PortAllocations");

            migrationBuilder.DropForeignKey(
                name: "FK_PortAllocations_ManagedServers_ServerId",
                table: "PortAllocations");

            migrationBuilder.DropForeignKey(
                name: "FK_ScheduledTaskServers_ManagedServers_ServerId",
                table: "ScheduledTaskServers");

            migrationBuilder.DropForeignKey(
                name: "FK_ScheduledTaskServers_ScheduledTasks_ScheduledTaskId",
                table: "ScheduledTaskServers");

            migrationBuilder.DropForeignKey(
                name: "FK_ServerAlerts_ManagedServers_ServerId",
                table: "ServerAlerts");

            migrationBuilder.DropForeignKey(
                name: "FK_ServerHealthChecks_ManagedServers_ServerId",
                table: "ServerHealthChecks");

            migrationBuilder.DropForeignKey(
                name: "FK_StoredDiscoveredServices_NetworkScanSessions_ScanId",
                table: "StoredDiscoveredServices");

            migrationBuilder.DropForeignKey(
                name: "FK_TaskExecutions_ManagedServers_ServerId",
                table: "TaskExecutions");

            migrationBuilder.DropForeignKey(
                name: "FK_TaskExecutions_ScheduledTasks_ScheduledTaskId",
                table: "TaskExecutions");

            migrationBuilder.DropForeignKey(
                name: "FK_UpdateReports_ManagedServers_ServerId",
                table: "UpdateReports");

            migrationBuilder.CreateTable(
                name: "DiskMetricsHistory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ServerId = table.Column<int>(type: "integer", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    DiskName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DiskType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    MountPoint = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Device = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    TotalBytes = table.Column<long>(type: "bigint", nullable: false),
                    UsedBytes = table.Column<long>(type: "bigint", nullable: false),
                    FreeBytes = table.Column<long>(type: "bigint", nullable: false),
                    UsagePercentage = table.Column<float>(type: "real", nullable: false),
                    Temperature = table.Column<float>(type: "real", nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DiskMetricsHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DiskMetricsHistory_ManagedServers_ServerId",
                        column: x => x.ServerId,
                        principalTable: "ManagedServers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "NetworkInterfaceMetricsHistory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ServerId = table.Column<int>(type: "integer", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    InterfaceName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    InterfaceType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    RxBytes = table.Column<long>(type: "bigint", nullable: false),
                    TxBytes = table.Column<long>(type: "bigint", nullable: false),
                    RxBytesPerSec = table.Column<long>(type: "bigint", nullable: false),
                    TxBytesPerSec = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NetworkInterfaceMetricsHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NetworkInterfaceMetricsHistory_ManagedServers_ServerId",
                        column: x => x.ServerId,
                        principalTable: "ManagedServers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SystemMetricsHistory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ServerId = table.Column<int>(type: "integer", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    NetworkRxBytes = table.Column<long>(type: "bigint", nullable: false),
                    NetworkTxBytes = table.Column<long>(type: "bigint", nullable: false),
                    NetworkRxBytesPerSec = table.Column<long>(type: "bigint", nullable: false),
                    NetworkTxBytesPerSec = table.Column<long>(type: "bigint", nullable: false),
                    CpuTemperature = table.Column<float>(type: "real", nullable: true),
                    GpuTemperature = table.Column<float>(type: "real", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemMetricsHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SystemMetricsHistory_ManagedServers_ServerId",
                        column: x => x.ServerId,
                        principalTable: "ManagedServers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_DiskMetricsHistory_ServerId_DiskName_Timestamp",
                table: "DiskMetricsHistory",
                columns: new[] { "ServerId", "DiskName", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_DiskMetricsHistory_ServerId_Timestamp",
                table: "DiskMetricsHistory",
                columns: new[] { "ServerId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_DiskMetricsHistory_Timestamp",
                table: "DiskMetricsHistory",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_NetworkInterfaceMetricsHistory_ServerId_InterfaceName_Times~",
                table: "NetworkInterfaceMetricsHistory",
                columns: new[] { "ServerId", "InterfaceName", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_NetworkInterfaceMetricsHistory_ServerId_Timestamp",
                table: "NetworkInterfaceMetricsHistory",
                columns: new[] { "ServerId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_NetworkInterfaceMetricsHistory_Timestamp",
                table: "NetworkInterfaceMetricsHistory",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_SystemMetricsHistory_ServerId_Timestamp",
                table: "SystemMetricsHistory",
                columns: new[] { "ServerId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_SystemMetricsHistory_Timestamp",
                table: "SystemMetricsHistory",
                column: "Timestamp");

            migrationBuilder.AddForeignKey(
                name: "FK_ContainerMetricsHistory_ManagedServers_ServerId",
                table: "ContainerMetricsHistory",
                column: "ServerId",
                principalTable: "ManagedServers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_DeploymentEnvironments_Deployments_DeploymentId",
                table: "DeploymentEnvironments",
                column: "DeploymentId",
                principalTable: "Deployments",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Deployments_GitRepositories_GitRepositoryId",
                table: "Deployments",
                column: "GitRepositoryId",
                principalTable: "GitRepositories",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Deployments_ManagedServers_ServerId",
                table: "Deployments",
                column: "ServerId",
                principalTable: "ManagedServers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_DeviceHistories_NetworkDevices_NetworkDeviceId",
                table: "DeviceHistories",
                column: "NetworkDeviceId",
                principalTable: "NetworkDevices",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_DockerServiceArrangements_ManagedServers_ServerId",
                table: "DockerServiceArrangements",
                column: "ServerId",
                principalTable: "ManagedServers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_GitBranches_Deployments_DeploymentId",
                table: "GitBranches",
                column: "DeploymentId",
                principalTable: "Deployments",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_GitBranches_GitRepositories_RepositoryId",
                table: "GitBranches",
                column: "RepositoryId",
                principalTable: "GitRepositories",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_GitRepositories_GitProviderConnections_GitProviderConnectio~",
                table: "GitRepositories",
                column: "GitProviderConnectionId",
                principalTable: "GitProviderConnections",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_IpReservations_NetworkDevices_NetworkDeviceId",
                table: "IpReservations",
                column: "NetworkDeviceId",
                principalTable: "NetworkDevices",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_IpReservations_Subnets_SubnetId",
                table: "IpReservations",
                column: "SubnetId",
                principalTable: "Subnets",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ManagedServers_ManagedServers_ParentServerId",
                table: "ManagedServers",
                column: "ParentServerId",
                principalTable: "ManagedServers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_NetworkDevices_ManagedServers_ManagedServerId",
                table: "NetworkDevices",
                column: "ManagedServerId",
                principalTable: "ManagedServers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_NetworkDevices_Subnets_SubnetId",
                table: "NetworkDevices",
                column: "SubnetId",
                principalTable: "Subnets",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_PortAllocations_Deployments_DeploymentId",
                table: "PortAllocations",
                column: "DeploymentId",
                principalTable: "Deployments",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_PortAllocations_ManagedServers_ServerId",
                table: "PortAllocations",
                column: "ServerId",
                principalTable: "ManagedServers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ScheduledTaskServers_ManagedServers_ServerId",
                table: "ScheduledTaskServers",
                column: "ServerId",
                principalTable: "ManagedServers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ScheduledTaskServers_ScheduledTasks_ScheduledTaskId",
                table: "ScheduledTaskServers",
                column: "ScheduledTaskId",
                principalTable: "ScheduledTasks",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ServerAlerts_ManagedServers_ServerId",
                table: "ServerAlerts",
                column: "ServerId",
                principalTable: "ManagedServers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ServerHealthChecks_ManagedServers_ServerId",
                table: "ServerHealthChecks",
                column: "ServerId",
                principalTable: "ManagedServers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_StoredDiscoveredServices_NetworkScanSessions_ScanId",
                table: "StoredDiscoveredServices",
                column: "ScanId",
                principalTable: "NetworkScanSessions",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_TaskExecutions_ManagedServers_ServerId",
                table: "TaskExecutions",
                column: "ServerId",
                principalTable: "ManagedServers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_TaskExecutions_ScheduledTasks_ScheduledTaskId",
                table: "TaskExecutions",
                column: "ScheduledTaskId",
                principalTable: "ScheduledTasks",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_UpdateReports_ManagedServers_ServerId",
                table: "UpdateReports",
                column: "ServerId",
                principalTable: "ManagedServers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ContainerMetricsHistory_ManagedServers_ServerId",
                table: "ContainerMetricsHistory");

            migrationBuilder.DropForeignKey(
                name: "FK_DeploymentEnvironments_Deployments_DeploymentId",
                table: "DeploymentEnvironments");

            migrationBuilder.DropForeignKey(
                name: "FK_Deployments_GitRepositories_GitRepositoryId",
                table: "Deployments");

            migrationBuilder.DropForeignKey(
                name: "FK_Deployments_ManagedServers_ServerId",
                table: "Deployments");

            migrationBuilder.DropForeignKey(
                name: "FK_DeviceHistories_NetworkDevices_NetworkDeviceId",
                table: "DeviceHistories");

            migrationBuilder.DropForeignKey(
                name: "FK_DockerServiceArrangements_ManagedServers_ServerId",
                table: "DockerServiceArrangements");

            migrationBuilder.DropForeignKey(
                name: "FK_GitBranches_Deployments_DeploymentId",
                table: "GitBranches");

            migrationBuilder.DropForeignKey(
                name: "FK_GitBranches_GitRepositories_RepositoryId",
                table: "GitBranches");

            migrationBuilder.DropForeignKey(
                name: "FK_GitRepositories_GitProviderConnections_GitProviderConnectio~",
                table: "GitRepositories");

            migrationBuilder.DropForeignKey(
                name: "FK_IpReservations_NetworkDevices_NetworkDeviceId",
                table: "IpReservations");

            migrationBuilder.DropForeignKey(
                name: "FK_IpReservations_Subnets_SubnetId",
                table: "IpReservations");

            migrationBuilder.DropForeignKey(
                name: "FK_ManagedServers_ManagedServers_ParentServerId",
                table: "ManagedServers");

            migrationBuilder.DropForeignKey(
                name: "FK_NetworkDevices_ManagedServers_ManagedServerId",
                table: "NetworkDevices");

            migrationBuilder.DropForeignKey(
                name: "FK_NetworkDevices_Subnets_SubnetId",
                table: "NetworkDevices");

            migrationBuilder.DropForeignKey(
                name: "FK_PortAllocations_Deployments_DeploymentId",
                table: "PortAllocations");

            migrationBuilder.DropForeignKey(
                name: "FK_PortAllocations_ManagedServers_ServerId",
                table: "PortAllocations");

            migrationBuilder.DropForeignKey(
                name: "FK_ScheduledTaskServers_ManagedServers_ServerId",
                table: "ScheduledTaskServers");

            migrationBuilder.DropForeignKey(
                name: "FK_ScheduledTaskServers_ScheduledTasks_ScheduledTaskId",
                table: "ScheduledTaskServers");

            migrationBuilder.DropForeignKey(
                name: "FK_ServerAlerts_ManagedServers_ServerId",
                table: "ServerAlerts");

            migrationBuilder.DropForeignKey(
                name: "FK_ServerHealthChecks_ManagedServers_ServerId",
                table: "ServerHealthChecks");

            migrationBuilder.DropForeignKey(
                name: "FK_StoredDiscoveredServices_NetworkScanSessions_ScanId",
                table: "StoredDiscoveredServices");

            migrationBuilder.DropForeignKey(
                name: "FK_TaskExecutions_ManagedServers_ServerId",
                table: "TaskExecutions");

            migrationBuilder.DropForeignKey(
                name: "FK_TaskExecutions_ScheduledTasks_ScheduledTaskId",
                table: "TaskExecutions");

            migrationBuilder.DropForeignKey(
                name: "FK_UpdateReports_ManagedServers_ServerId",
                table: "UpdateReports");

            migrationBuilder.DropTable(
                name: "DiskMetricsHistory");

            migrationBuilder.DropTable(
                name: "NetworkInterfaceMetricsHistory");

            migrationBuilder.DropTable(
                name: "SystemMetricsHistory");

            migrationBuilder.AddForeignKey(
                name: "FK_ContainerMetricsHistory_ManagedServers_ServerId",
                table: "ContainerMetricsHistory",
                column: "ServerId",
                principalTable: "ManagedServers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_DeploymentEnvironments_Deployments_DeploymentId",
                table: "DeploymentEnvironments",
                column: "DeploymentId",
                principalTable: "Deployments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Deployments_GitRepositories_GitRepositoryId",
                table: "Deployments",
                column: "GitRepositoryId",
                principalTable: "GitRepositories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Deployments_ManagedServers_ServerId",
                table: "Deployments",
                column: "ServerId",
                principalTable: "ManagedServers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_DeviceHistories_NetworkDevices_NetworkDeviceId",
                table: "DeviceHistories",
                column: "NetworkDeviceId",
                principalTable: "NetworkDevices",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_DockerServiceArrangements_ManagedServers_ServerId",
                table: "DockerServiceArrangements",
                column: "ServerId",
                principalTable: "ManagedServers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_GitBranches_Deployments_DeploymentId",
                table: "GitBranches",
                column: "DeploymentId",
                principalTable: "Deployments",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_GitBranches_GitRepositories_RepositoryId",
                table: "GitBranches",
                column: "RepositoryId",
                principalTable: "GitRepositories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_GitRepositories_GitProviderConnections_GitProviderConnectio~",
                table: "GitRepositories",
                column: "GitProviderConnectionId",
                principalTable: "GitProviderConnections",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_IpReservations_NetworkDevices_NetworkDeviceId",
                table: "IpReservations",
                column: "NetworkDeviceId",
                principalTable: "NetworkDevices",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_IpReservations_Subnets_SubnetId",
                table: "IpReservations",
                column: "SubnetId",
                principalTable: "Subnets",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_ManagedServers_ManagedServers_ParentServerId",
                table: "ManagedServers",
                column: "ParentServerId",
                principalTable: "ManagedServers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_NetworkDevices_ManagedServers_ManagedServerId",
                table: "NetworkDevices",
                column: "ManagedServerId",
                principalTable: "ManagedServers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_NetworkDevices_Subnets_SubnetId",
                table: "NetworkDevices",
                column: "SubnetId",
                principalTable: "Subnets",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PortAllocations_Deployments_DeploymentId",
                table: "PortAllocations",
                column: "DeploymentId",
                principalTable: "Deployments",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PortAllocations_ManagedServers_ServerId",
                table: "PortAllocations",
                column: "ServerId",
                principalTable: "ManagedServers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ScheduledTaskServers_ManagedServers_ServerId",
                table: "ScheduledTaskServers",
                column: "ServerId",
                principalTable: "ManagedServers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ScheduledTaskServers_ScheduledTasks_ScheduledTaskId",
                table: "ScheduledTaskServers",
                column: "ScheduledTaskId",
                principalTable: "ScheduledTasks",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ServerAlerts_ManagedServers_ServerId",
                table: "ServerAlerts",
                column: "ServerId",
                principalTable: "ManagedServers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ServerHealthChecks_ManagedServers_ServerId",
                table: "ServerHealthChecks",
                column: "ServerId",
                principalTable: "ManagedServers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_StoredDiscoveredServices_NetworkScanSessions_ScanId",
                table: "StoredDiscoveredServices",
                column: "ScanId",
                principalTable: "NetworkScanSessions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_TaskExecutions_ManagedServers_ServerId",
                table: "TaskExecutions",
                column: "ServerId",
                principalTable: "ManagedServers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TaskExecutions_ScheduledTasks_ScheduledTaskId",
                table: "TaskExecutions",
                column: "ScheduledTaskId",
                principalTable: "ScheduledTasks",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_UpdateReports_ManagedServers_ServerId",
                table: "UpdateReports",
                column: "ServerId",
                principalTable: "ManagedServers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
