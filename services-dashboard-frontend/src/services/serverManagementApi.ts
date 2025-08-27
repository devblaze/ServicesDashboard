import { BaseApiClient } from './BaseApiClient';
import type { 
  ManagedServer, 
  ServerAlert, 
  ServerHealthCheck,
  UpdateReport,
  CreateServerDto,
  ServerType,
  AlertType,
  AlertSeverity,
} from '../types/ServerManagement';

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
    const rawServer = await this.request<RawManagedServer>('get', `/servermanagement/${id}`);
    return this.transformServer(rawServer);
  }

  async addServer(server: CreateServerDto): Promise<ManagedServer> {
    const rawServer = await this.request<RawManagedServer>('post', '/servermanagement', server);
    return this.transformServer(rawServer);
  }

  async updateServer(id: number, server: Partial<CreateServerDto>): Promise<ManagedServer> {
    const rawServer = await this.request<RawManagedServer>('put', `/servermanagement/${id}`, server);
    return this.transformServer(rawServer);
  }

  async deleteServer(id: number): Promise<void> {
    return this.request<void>('delete', `/servermanagement/${id}`);
  }

  async getAlerts(): Promise<ServerAlert[]> {
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
    return this.request<ServerHealthCheck>('post', `/servermanagement/${serverId}/health-check`);
  }

  async checkUpdates(serverId: number): Promise<UpdateReport> {
    return this.request<UpdateReport>('post', `/servermanagement/${serverId}/check-updates`);
  }

  async testServerConnection(server: ManagedServer): Promise<boolean> {
    return this.request<boolean>('post', `/servermanagement/${server.id}/test-connection`, server);
  }

  async testNewServerConnection(server: CreateServerDto): Promise<boolean> {
    return this.request<boolean>('post', '/servermanagement/test-new-connection', server);
  }

  async getServerLogs(id: number, lines: number = 100): Promise<string> {
    const response = await this.request<{ logs: string }>('get', `/servermanagement/${id}/logs?lines=${lines}`);
    return response.logs;
  }

  async analyzeServerLogs(id: number, lines: number = 500): Promise<LogAnalysisResult> {
    return this.request<LogAnalysisResult>('post', `/servermanagement/${id}/analyze-logs?lines=${lines}`);
  }

  async executeCommand(id: number, command: string): Promise<CommandResult> {
    return this.request<CommandResult>('post', `/servermanagement/${id}/execute-command`, { command });
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
}

export const serverManagementApi = new ServerManagementApiClient();