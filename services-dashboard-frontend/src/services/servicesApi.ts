import { BaseApiClient } from './BaseApiClient';
import type { HostedService, CreateServiceDto } from '../types/Service.ts';

class ServicesApiClient extends BaseApiClient {
  constructor() {
    super({ serviceName: 'Services API' });
  }

  async getServices(): Promise<HostedService[]> {
    return this.request<HostedService[]>('get', '/api/services');
  }

  async getService(id: string): Promise<HostedService> {
    return this.request<HostedService>('get', `/api/services/${id}`);
  }

  async createService(service: CreateServiceDto): Promise<HostedService> {
    return this.request<HostedService>('post', '/api/services', service);
  }

  async updateService(id: string, service: Partial<HostedService>): Promise<HostedService> {
    return this.request<HostedService>('put', `/api/services/${id}`, service);
  }

  async deleteService(id: string): Promise<void> {
    return this.request<void>('delete', `/api/services/${id}`);
  }

  async checkServiceHealth(id: string): Promise<void> {
    return this.request<void>('post', `/api/services/${id}/check-health`);
  }
}

export const apiClient = new ServicesApiClient();