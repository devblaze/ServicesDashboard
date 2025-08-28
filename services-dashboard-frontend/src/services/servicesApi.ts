import { BaseApiClient } from './BaseApiClient';
import type { HostedService, CreateServiceDto } from '../types/Service.ts';

export interface ServerSummary {
  id: number;
  name: string;
  hostAddress: string;
  status: string;
  type: string;
  lastCheckTime?: string;
}

class ServicesApiClient extends BaseApiClient {
  constructor() {
    super({ serviceName: 'Services API' });
  }

  async getServices(): Promise<HostedService[]> {
    return this.request<HostedService[]>('get', '/services');
  }

  async getService(id: string): Promise<HostedService> {
    return this.request<HostedService>('get', `/services/${id}`);
  }

  async createService(service: CreateServiceDto): Promise<HostedService> {
    return this.request<HostedService>('post', '/services', service);
  }

  async updateService(id: string, service: Partial<HostedService>): Promise<HostedService> {
    return this.request<HostedService>('put', `/services/${id}`, service);
  }

  async deleteService(id: string): Promise<void> {
    return this.request<void>('delete', `/services/${id}`);
  }

  async checkServiceHealth(id: string): Promise<void> {
    return this.request<void>('post', `/api/services/${id}/check-health`);
  }

  async getServersForServices(): Promise<ServerSummary[]> {
    return this.request<ServerSummary[]>('get', '/services/servers');
  }
}

export const apiClient = new ServicesApiClient();