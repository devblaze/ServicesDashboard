import { BaseApiClient } from './BaseApiClient';
import type { 
  ManagedServer, 
  ServerHealthCheck, 
  UpdateReport, 
  ServerAlert,
  CreateServerDto 
} from '../types/ServerManagementInterfaces';

class ServerManagementApiClient extends BaseApiClient {
  constructor() {
    super({ serviceName: 'Server Management API' });
  }

  // Server operations
  async getServers(): Promise<ManagedServer[]> {
    return this.request<ManagedServer[]>('get', '/servermanagement');
  }

  async getServer(id: number): Promise<ManagedServer> {
    return this.request<ManagedServer>('get', `/servermanagement/${id}`);
  }

  async addServer(server: CreateServerDto): Promise<ManagedServer> {
    return this.request<ManagedServer>('post', '/servermanagement', server);
  }

  async updateServer(id: number, server: Partial<ManagedServer>): Promise<ManagedServer> {
    return this.request<ManagedServer>('put', `/servermanagement/${id}`, server);
  }

  async deleteServer(id: number): Promise<void> {
    return this.request<void>('delete', `/servermanagement/${id}`);
  }

  // Server operations
  async performHealthCheck(id: number): Promise<ServerHealthCheck> {
    return this.request<ServerHealthCheck>('post', `/servermanagement/${id}/health-check`);
  }

  async checkUpdates(id: number): Promise<UpdateReport> {
    return this.request<UpdateReport>('post', `/servermanagement/${id}/check-updates`);
  }

  async testConnection(id: number): Promise<boolean> {
    return this.request<boolean>('post', `/servermanagement/${id}/test-connection`);
  }

  // Alerts
  async getAlerts(serverId?: number): Promise<ServerAlert[]> {
    const params = serverId ? { serverId } : undefined;
    return this.request<ServerAlert[]>('get', '/servermanagement/alerts', undefined, params);
  }

  async resolveAlert(alertId: number, resolution?: string): Promise<void> {
    return this.request<void>('patch', `/servermanagement/alerts/${alertId}/resolve`, { resolution });
  }
}

export const serverManagementApi = new ServerManagementApiClient();