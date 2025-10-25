import { BaseApiClient } from './BaseApiClient';
import type {
  ManagedServer,
  ServerAlert,
  ServerHealthCheck,
  UpdateReport,
  CreateServerDto,
  UpdateServerDto,
  ServerType,
  ServerGroup,
  AlertType,
  AlertSeverity,
} from '../types/ServerManagement';
import { mockServers } from '../mocks/mockServers';
import { generateMockServerLogs, generateMockLogAnalysis } from '../mocks/mockServerLogs';

const isDemoMode = () => import.meta.env.VITE_DEMO_MODE === 'true';

export type UpdateStatus = 
  | 'Pending'
  | 'InProgress'
  | 'Completed'
  | 'Failed'
  | 'Skipped';

// Use const assertions instead of enums for compatibility
const ServerStatusEnum = {
  Unknown: 0,
  Online: 1,
  Warning: 2,
  Critical: 3,
  Offline: 4
} as const;

const ServerTypeEnum = {
  Server: 0,
  RaspberryPi: 1,
  VirtualMachine: 2,
  Container: 3
} as const;

// Define a generic package type instead of any
interface PackageInfo {
  name: string;
  currentVersion?: string;
  availableVersion?: string;
  type?: string;
  [key: string]: unknown;
}

// Raw data interfaces to handle backend data
interface RawServerHealthCheck {
  id: number;
  serverId: number;
  checkTime: string;
  isHealthy: boolean;
  cpuUsage?: number | null;
  memoryUsage?: number | null;
  diskUsage?: number | null;
  loadAverage?: number | null;
  runningProcesses?: number | null;
  errorMessage?: string | null;
  rawData?: string | null;
}

interface RawUpdateReport {
  id: number;
  serverId: number;
  scanTime: string; // Changed from checkTime to match backend
  status: number; // Changed from string to number to match enum
  availableUpdates: number;
  securityUpdates: number;
  packages?: PackageInfo[];
  rawOutput?: string | null;
}

interface RawServerAlert {
  id: number;
  serverId: number;
  createdAt: string;
  type: number;
  severity: number;
  message: string;
  details?: string | null;
  isResolved: boolean;
  resolvedAt?: string | null;
  resolution?: string | null;
}

interface RawManagedServer {
  id: number;
  name: string;
  hostAddress: string;
  sshPort: number;
  username: string;
  encryptedPassword: string | null;
  type: number;
  status: number;
  group: string;
  operatingSystem: string | null;
  systemInfo: string | null;
  tags: string | null;
  lastCheckTime: string | null;
  createdAt: string;
  updatedAt: string;
  healthChecks?: RawServerHealthCheck[];
  updateReports?: RawUpdateReport[];
  alerts?: RawServerAlert[];
}

// Add these interfaces and method to the ServerManagementApiClient class:

export interface CommandResult {
  command?: string;
  output: string;
  error: string;
  exitCode: number;
  executedAt: string;
}

export interface LogAnalysisResult {
  summary: string;
  issues: LogIssue[];
  recommendations: string[];
  confidence: number;
  analyzedAt: string;
}

export interface LogIssue {
  type: string;
  severity: string;
  description: string;
  logLine: string;
  lineNumber: number;
}

// Add these interfaces to the existing file
export interface DockerService {
  containerId: string;
  name: string;
  image: string;
  status: string;
  ports: DockerPort[];
  labels: Record<string, string>;
  environment: Record<string, string>;
  createdAt: string;
  description?: string;
  serviceUrl?: string;
  isWebService: boolean;
}

export interface DockerPort {
  containerPort: number;
  hostPort?: number;
  protocol: string;
  hostIp?: string;
}

export interface DockerServiceDiscoveryResult {
  services: DockerService[];
  discoveryTime: string;
  success: boolean;
  errorMessage?: string;
}

export interface CreateServiceFromDockerRequest {
  containerId: string;
  name: string;
  description: string;
  serviceUrl?: string;
  port?: number;
  environment: string;
}

export interface DockerIpSyncResult {
  success: boolean;
  errorMessage?: string;
  devicesCreated: number;
  devicesUpdated: number;
  totalContainersScanned: number;
  syncedContainers: string[];
}

export interface NetworkInterfacesSyncResult {
  success: boolean;
  errorMessage?: string;
  serverId: number;
  dockerContainersSynced: number;
  virtualMachinesSynced: number;
  networkInterfacesSynced: number;
  totalDevicesSynced: number;
  syncDetails: string[];
}

export interface BulkSyncResult {
  success: boolean;
  errorMessage?: string;
  totalServers: number;
  successfulServers: number;
  failedServers: number;
  totalDevicesSynced: number;
  serverResults: ServerSyncSummary[];
}

export interface ServerSyncSummary {
  serverId: number;
  serverName: string;
  success: boolean;
  devicesSynced: number;
  details?: string;
  errorMessage?: string;
}

export interface IpConflictCheckResult {
  isAvailable: boolean;
  hasConflict: boolean;
  conflicts: IpConflictDetail[];
  isReachableOnNetwork: boolean;
  pingResponse?: string;
}

export interface IpConflictDetail {
  source: string; // "Database", "Docker", "VM", "NetworkInterface", "Server"
  deviceName: string;
  serverName?: string;
  serverId?: number;
  macAddress?: string;
  details?: string;
  status: string; // "Online", "Offline"
}

export interface DockerNetworkMigrationAnalysis {
  serverId: number;
  serverName: string;
  containersByNetwork: Record<string, DockerContainerInfo[]>;
  totalContainers: number;
  containersNeedingMigration: number;
  suggestedIpRange: string[];
}

export interface DockerContainerInfo {
  containerId: string;
  name: string;
  image: string;
  status: string;
  networkMode: string;
  currentIp?: string;
  suggestedIp?: string;
  isRunning: boolean;
  needsMigration: boolean;
}

export interface IpSuggestionRequest {
  serverId: number;
  containerIds: string[];
  targetNetwork: string;
  ipRangeStart: string;
  ipRangeEnd: string;
}

export interface IpSuggestionResult {
  success: boolean;
  errorMessage?: string;
  suggestions: ContainerIpSuggestion[];
  totalChecked: number;
  availableIpsFound: number;
}

export interface ContainerIpSuggestion {
  containerId: string;
  containerName: string;
  currentIp?: string;
  suggestedIp: string;
  hasConflict: boolean;
  conflicts: IpConflictDetail[];
}

class ServerManagementApiClient extends BaseApiClient {
  constructor() {
    super({ serviceName: 'Server Management API' });
  }

  private transformStatus(status: number): 'Unknown' | 'Online' | 'Warning' | 'Critical' | 'Offline' {
    switch (status) {
      case ServerStatusEnum.Online: return 'Online';
      case ServerStatusEnum.Warning: return 'Warning';
      case ServerStatusEnum.Critical: return 'Critical';
      case ServerStatusEnum.Offline: return 'Offline';
      default: return 'Unknown';
    }
  }

  private transformType(type: number): ServerType {
    switch (type) {
      case ServerTypeEnum.RaspberryPi: return 'RaspberryPi';
      case ServerTypeEnum.VirtualMachine: return 'VirtualMachine';
      case ServerTypeEnum.Container: return 'Container';
      default: return 'Server';
    }
  }

  private transformGroup(group: string): ServerGroup {
    // Backend sends string enums like "OnPremise" or "Remote"
    return group as ServerGroup;
  }

  private transformAlertType(type: number): AlertType {
    // Cast to AlertType since we don't know the exact values
    // You'll need to adjust the mapping based on your actual AlertType definition
    const alertTypeMap: Record<number, AlertType> = {
      0: 'Health' as AlertType,
      1: 'Security' as AlertType,
      2: 'Performance' as AlertType,
      3: 'Connectivity' as AlertType,
      4: 'Storage' as AlertType,
      5: 'Authentication' as AlertType,
      6: 'Update' as AlertType,
      7: 'Service' as AlertType,
    };
    return alertTypeMap[type] || (Object.values(alertTypeMap)[0] as AlertType);
  }

  private transformAlertSeverity(severity: number): AlertSeverity {
    // Cast to AlertSeverity since we don't know the exact values
    // You'll need to adjust the mapping based on your actual AlertSeverity definition
    const severityMap: Record<number, AlertSeverity> = {
      0: 'Info' as AlertSeverity,
      1: 'Low' as AlertSeverity,
      2: 'Medium' as AlertSeverity,
      3: 'High' as AlertSeverity,
      4: 'Critical' as AlertSeverity,
    };
    return severityMap[severity] || (Object.values(severityMap)[0] as AlertSeverity);
  }

  private transformUpdateStatus(status: string | number): UpdateStatus {
    // Handle numeric enum values from backend
    if (typeof status === 'number') {
      switch (status) {
        case 0: return 'Pending';
        case 1: return 'InProgress'; 
        case 2: return 'Completed';
        case 3: return 'Failed';
        case 4: return 'Skipped';
        default: return 'Pending';
      }
    }
    
    // Handle string values (fallback)
    if (typeof status === 'string') {
      const statusMap: Record<string, UpdateStatus> = {
        'pending': 'Pending',
        'inprogress': 'InProgress',
        'in_progress': 'InProgress',
        'completed': 'Completed',
        'failed': 'Failed',
        'skipped': 'Skipped',
        'up_to_date': 'Skipped', // Map this to Skipped or create UpToDate if needed
      };
      return statusMap[status.toLowerCase()] || 'Pending';
    }
    
    return 'Pending';
  }

  // Clean circular references and transform server
  private transformServer(raw: RawManagedServer): ManagedServer {
    // Clean up circular references in nested objects
    const cleanHealthChecks: ServerHealthCheck[] = (raw.healthChecks || []).map(hc => ({
      id: hc.id,
      serverId: hc.serverId,
      checkTime: hc.checkTime,
      isHealthy: hc.isHealthy,
      cpuUsage: hc.cpuUsage ?? undefined,
      memoryUsage: hc.memoryUsage ?? undefined,
      diskUsage: hc.diskUsage ?? undefined,
      loadAverage: hc.loadAverage ?? undefined,
      runningProcesses: hc.runningProcesses ?? undefined,
      errorMessage: hc.errorMessage ?? undefined,
      rawData: hc.rawData ?? undefined
      // Exclude the circular 'server' reference
    }));

    const cleanAlerts: ServerAlert[] = (raw.alerts || []).map(alert => ({
      id: alert.id,
      serverId: alert.serverId,
      createdAt: alert.createdAt,
      type: this.transformAlertType(alert.type),
      severity: this.transformAlertSeverity(alert.severity),
      message: alert.message,
      details: alert.details ?? undefined,
      isResolved: alert.isResolved,
      resolvedAt: alert.resolvedAt ?? undefined,
      resolution: alert.resolution ?? undefined
      // Exclude the circular 'server' reference
    }));

    const cleanUpdateReports: UpdateReport[] = (raw.updateReports || []).map(report => ({
      id: report.id,
      serverId: report.serverId,
      scanTime: report.scanTime, // Use correct property name
      status: this.transformUpdateStatus(report.status), // Transform string status to UpdateStatus
      availableUpdates: report.availableUpdates,
      securityUpdates: report.securityUpdates,
      packages: report.packages || [],
      rawOutput: report.rawOutput ?? undefined
      // Exclude the circular 'server' reference
    }));

    return {
      ...raw,
      status: this.transformStatus(raw.status),
      type: this.transformType(raw.type),
      group: this.transformGroup(raw.group),
      operatingSystem: raw.operatingSystem ?? undefined,
      systemInfo: raw.systemInfo ?? undefined,
      tags: raw.tags ?? undefined,
      lastCheckTime: raw.lastCheckTime ?? undefined,
      healthChecks: cleanHealthChecks,
      updateReports: cleanUpdateReports,
      alerts: cleanAlerts
    };
  }

  // Handle 500 errors gracefully with fallbacks
  private async handleRequest<T>(
    operation: () => Promise<T>, 
    fallback: T,
    operationName: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`⚠️ ${operationName} failed, using fallback:`, errorMessage);
      
      // If it's a 500 error with circular reference, return fallback
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: unknown } };
        if (axiosError.response?.status === 500 && 
            typeof axiosError.response.data === 'string' &&
            axiosError.response.data.includes('object cycle')) {
          console.warn(`🔄 Circular reference detected in ${operationName}, using fallback data`);
          return fallback;
        }
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  async getServers(): Promise<ManagedServer[]> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 400));
      return mockServers;
    }

    return this.handleRequest(
      async () => {
        const rawServers = await this.request<RawManagedServer[]>('get', '/servermanagement');
        return rawServers.map(server => this.transformServer(server));
      },
      [], // Fallback to empty array
      'getServers'
    );
  }

  async getServer(id: number): Promise<ManagedServer> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const server = mockServers.find(s => s.id === id);
      if (!server) {
        throw new Error('Server not found');
      }
      return server;
    }

    const rawServer = await this.request<RawManagedServer>('get', `/servermanagement/${id}`);
    return this.transformServer(rawServer);
  }

  async addServer(server: CreateServerDto): Promise<ManagedServer> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 600));
      const newServer: ManagedServer = {
        id: Math.max(...mockServers.map(s => s.id)) + 1,
        name: server.name,
        hostAddress: server.hostAddress,
        sshPort: server.sshPort,
        username: server.username,
        type: server.type,
        status: 'Unknown',
        group: server.group,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: server.tags || undefined,
        parentServerId: server.parentServerId || null,
        parentServerName: null,
        childServerCount: 0,
        isDashboardServer: false,
        healthChecks: [],
        updateReports: [],
        alerts: [],
      };
      return newServer;
    }

    const rawServer = await this.request<RawManagedServer>('post', '/servermanagement', server);
    return this.transformServer(rawServer);
  }

  async updateServer(id: number, server: UpdateServerDto): Promise<ManagedServer> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 400));
      const existingServer = mockServers.find(s => s.id === id);
      if (!existingServer) {
        throw new Error('Server not found');
      }
      return {
        ...existingServer,
        ...server,
        tags: server.tags === null ? undefined : server.tags ?? existingServer.tags,
        updatedAt: new Date().toISOString(),
      };
    }

    const rawServer = await this.request<RawManagedServer>('put', `/servermanagement/${id}`, server);
    return this.transformServer(rawServer);
  }

  async deleteServer(id: number): Promise<void> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 400));
      console.log('Demo mode: simulating server deletion', id);
      return;
    }

    return this.request<void>('delete', `/servermanagement/${id}`);
  }

  async getAlerts(): Promise<ServerAlert[]> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return mockServers.flatMap(server => server.alerts || []);
    }

    return this.handleRequest(
      async () => {
        const rawAlerts = await this.request<RawServerAlert[]>('get', '/servermanagement/alerts');
        // Clean up circular references in alerts
        return rawAlerts.map(alert => ({
          id: alert.id,
          serverId: alert.serverId,
          createdAt: alert.createdAt,
          type: this.transformAlertType(alert.type),
          severity: this.transformAlertSeverity(alert.severity),
          message: alert.message,
          details: alert.details ?? undefined,
          isResolved: alert.isResolved,
          resolvedAt: alert.resolvedAt ?? undefined,
          resolution: alert.resolution ?? undefined
          // Don't include the full server object to avoid circular references
        }));
      },
      [], // Fallback to empty array
      'getAlerts'
    );
  }

  async performHealthCheck(serverId: number): Promise<ServerHealthCheck> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const healthCheck: ServerHealthCheck = {
        id: Date.now(),
        serverId,
        checkTime: new Date().toISOString(),
        isHealthy: true,
        cpuUsage: 20 + Math.random() * 40,
        memoryUsage: 30 + Math.random() * 40,
        diskUsage: 40 + Math.random() * 30,
        loadAverage: 0.5 + Math.random() * 2,
        runningProcesses: 100 + Math.floor(Math.random() * 150),
      };
      console.log('Demo mode: simulating health check', healthCheck);
      return healthCheck;
    }

    return this.request<ServerHealthCheck>('post', `/servermanagement/${serverId}/health-check`, {});
  }

  async checkUpdates(serverId: number): Promise<UpdateReport> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const availableUpdates = Math.floor(Math.random() * 10);
      const securityUpdates = Math.floor(availableUpdates * 0.3);
      const updateReport: UpdateReport = {
        id: Date.now(),
        serverId,
        scanTime: new Date().toISOString(),
        availableUpdates,
        securityUpdates,
        packageDetails: availableUpdates > 0
          ? `${availableUpdates} packages available for update including ${securityUpdates} security updates`
          : 'System is up to date',
        status: availableUpdates > 0 ? 'Pending' : 'Completed',
        aiRecommendation: securityUpdates > 0
          ? 'Security updates available. Recommend updating within 24 hours.'
          : 'System is stable. Regular maintenance recommended.',
        aiConfidence: 0.85 + Math.random() * 0.1,
      };
      console.log('Demo mode: simulating update check', updateReport);
      return updateReport;
    }

    return this.request<UpdateReport>('post', `/servermanagement/${serverId}/check-updates`, {});
  }

  async testServerConnection(server: ManagedServer): Promise<boolean> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 800));
      console.log('Demo mode: simulating connection test', server.name);
      return server.status !== 'Offline';
    }

    return this.request<boolean>('post', `/servermanagement/${server.id}/test-connection`, server);
  }

  async testNewServerConnection(server: CreateServerDto): Promise<boolean> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      console.log('Demo mode: simulating new server connection test', server.name);
      return true;
    }

    return this.request<boolean>('post', '/servermanagement/test-new-connection', server);
  }

  async getServerLogs(id: number, lines: number = 100): Promise<string> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return generateMockServerLogs(id, lines);
    }

    const response = await this.request<{ logs: string }>('get', `/servermanagement/${id}/logs?lines=${lines}`);
    return response.logs;
  }

  async analyzeServerLogs(id: number, lines: number = 500): Promise<LogAnalysisResult> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 2500));
      return generateMockLogAnalysis(id);
    }

    return this.request<LogAnalysisResult>('post', `/servermanagement/${id}/analyze-logs?lines=${lines}`);
  }

  async executeCommand(id: number, command: string): Promise<CommandResult> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockResult: CommandResult = {
        output: `Demo mode: Simulated execution of command '${command}'`,
        error: '',
        exitCode: 0,
        executedAt: new Date().toISOString(),
      };
      return mockResult;
    }

    return this.request<CommandResult>('post', `/servermanagement/${id}/execute-command`, { command });
  }

  async cleanupTerminalSession(id: number): Promise<void> {
    return this.request<void>('delete', `/servermanagement/${id}/terminal-session`);
  }

  async checkTmuxAvailability(id: number): Promise<{ isAvailable: boolean; version?: string; message?: string }> {
    return this.request<{ isAvailable: boolean; version?: string; message?: string }>('get', `/servermanagement/${id}/check-tmux`);
  }

  async installTmux(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>('post', `/servermanagement/${id}/install-tmux`);
  }

  async getSshSession(id: number): Promise<{ serverId: number; host: string; port: number; username: string }> {
    return this.request<{ serverId: number; host: string; port: number; username: string }>('get', `/servermanagement/${id}/ssh-session`);
  }

  // Add these methods to the ServerManagementApiClient class
  async getDockerServices(serverId: number): Promise<DockerServiceDiscoveryResult> {
    return this.request<DockerServiceDiscoveryResult>('get', `/servermanagement/${serverId}/docker-services`);
  }

  async addDockerServiceToServices(serverId: number, containerId: string, request: CreateServiceFromDockerRequest): Promise<void> {
    return this.request<void>('post', `/servermanagement/${serverId}/docker-services/${containerId}/add-to-services`, request);
  }

  async syncDockerIps(serverId: number): Promise<DockerIpSyncResult> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const mockResult: DockerIpSyncResult = {
        success: true,
        devicesCreated: Math.floor(Math.random() * 5) + 2,
        devicesUpdated: Math.floor(Math.random() * 3),
        totalContainersScanned: Math.floor(Math.random() * 10) + 5,
        syncedContainers: [
          'plex (192.168.4.10)',
          'nextcloud (192.168.4.15)',
          'home-assistant (192.168.4.20)'
        ]
      };
      return mockResult;
    }

    return this.request<DockerIpSyncResult>('post', `/servermanagement/${serverId}/sync-docker-ips`);
  }

  async syncAllNetworkInterfaces(serverId: number): Promise<NetworkInterfacesSyncResult> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockResult: NetworkInterfacesSyncResult = {
        success: true,
        serverId,
        dockerContainersSynced: Math.floor(Math.random() * 5) + 2,
        virtualMachinesSynced: Math.floor(Math.random() * 3),
        networkInterfacesSynced: Math.floor(Math.random() * 2),
        totalDevicesSynced: Math.floor(Math.random() * 10) + 5,
        syncDetails: [
          'Docker: plex (192.168.4.10)',
          'VM: ubuntu-server (192.168.4.50)',
          'Interface: bond0 (192.168.4.1)'
        ]
      };
      return mockResult;
    }

    return this.request<NetworkInterfacesSyncResult>('post', `/servermanagement/${serverId}/sync-all-network-interfaces`);
  }

  async syncAllServers(): Promise<BulkSyncResult> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      const mockResult: BulkSyncResult = {
        success: true,
        totalServers: 3,
        successfulServers: 3,
        failedServers: 0,
        totalDevicesSynced: 15,
        serverResults: [
          {
            serverId: 1,
            serverName: 'Unraid Server',
            success: true,
            devicesSynced: 8,
            details: 'Docker: 5, VMs: 2, Interfaces: 1'
          },
          {
            serverId: 2,
            serverName: 'Ubuntu Server',
            success: true,
            devicesSynced: 5,
            details: 'Docker: 3, VMs: 0, Interfaces: 2'
          },
          {
            serverId: 3,
            serverName: 'Proxmox',
            success: true,
            devicesSynced: 2,
            details: 'Docker: 0, VMs: 2, Interfaces: 0'
          }
        ]
      };
      return mockResult;
    }

    return this.request<BulkSyncResult>('post', '/servermanagement/sync-all-servers');
  }

  async checkIpConflict(ipAddress: string, excludeDeviceId?: number): Promise<IpConflictCheckResult> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Simulate random conflict detection
      const hasConflict = Math.random() > 0.7;
      const mockResult: IpConflictCheckResult = {
        isAvailable: !hasConflict,
        hasConflict,
        conflicts: hasConflict ? [{
          source: 'Docker',
          deviceName: 'plex-container',
          serverName: 'Unraid Server',
          serverId: 1,
          details: 'Docker Container',
          status: 'Online'
        }] : [],
        isReachableOnNetwork: Math.random() > 0.5,
        pingResponse: 'Device is reachable'
      };
      return mockResult;
    }

    return this.request<IpConflictCheckResult>('post', '/servermanagement/check-ip-conflict', {
      ipAddress,
      excludeDeviceId
    });
  }

  async analyzeDockerNetworks(serverId: number): Promise<DockerNetworkMigrationAnalysis> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const mockResult: DockerNetworkMigrationAnalysis = {
        serverId,
        serverName: 'Unraid Server',
        containersByNetwork: {
          'br0': [
            { containerId: '1', name: 'kimai', image: 'kimai:latest', status: 'stopped', networkMode: 'br0', isRunning: false, needsMigration: true },
            { containerId: '2', name: 'nginx-proxy-manager', image: 'nginx-proxy-manager', status: 'stopped', networkMode: 'br0', isRunning: false, needsMigration: true },
          ],
          'bond0': [
            { containerId: '3', name: 'jellyseerr', image: 'jellyseerr:latest', status: 'running', networkMode: 'bond0', currentIp: '192.168.4.230', isRunning: true, needsMigration: false },
          ],
          'bridge': [
            { containerId: '4', name: 'radarr', image: 'radarr:latest', status: 'running', networkMode: 'bridge', currentIp: '172.17.0.4', isRunning: true, needsMigration: false },
          ]
        },
        totalContainers: 4,
        containersNeedingMigration: 2,
        suggestedIpRange: ['192.168.4.100', '192.168.4.249']
      };
      return mockResult;
    }

    return this.request<DockerNetworkMigrationAnalysis>('get', `/servermanagement/${serverId}/analyze-docker-networks`);
  }

  async suggestIpsForMigration(request: IpSuggestionRequest): Promise<IpSuggestionResult> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockResult: IpSuggestionResult = {
        success: true,
        suggestions: request.containerIds.map((id, idx) => ({
          containerId: id,
          containerName: `Container ${idx + 1}`,
          suggestedIp: `192.168.4.${100 + idx}`,
          hasConflict: false,
          conflicts: []
        })),
        totalChecked: request.containerIds.length * 5,
        availableIpsFound: request.containerIds.length
      };
      return mockResult;
    }

    return this.request<IpSuggestionResult>('post', '/servermanagement/suggest-ips-for-migration', request);
  }
}

export const serverManagementApi = new ServerManagementApiClient();