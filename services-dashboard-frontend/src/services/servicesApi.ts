import { BaseApiClient } from './BaseApiClient';
import type { HostedService, CreateServiceDto } from '../types/Service.ts';
import { mockServices } from '../mocks/mockServices';

export interface ServerSummary {
  id: number;
  name: string;
  hostAddress: string;
  status: string;
  type: string;
  lastCheckTime?: string;
}

const isDemoMode = () => import.meta.env.VITE_DEMO_MODE === 'true';

class ServicesApiClient extends BaseApiClient {
  constructor() {
    super({ serviceName: 'Services API' });
  }

  async getServices(): Promise<HostedService[]> {
    if (isDemoMode()) {
      // Simulate network delay for realism
      await new Promise(resolve => setTimeout(resolve, 300));
      return mockServices;
    }
    return this.request<HostedService[]>('get', '/services');
  }

  async getService(id: string): Promise<HostedService> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const service = mockServices.find(s => s.id.toString() === id);
      if (!service) {
        throw new Error('Service not found');
      }
      return service;
    }
    return this.request<HostedService>('get', `/services/${id}`);
  }

  async createService(service: CreateServiceDto): Promise<HostedService> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 400));
      // In demo mode, just return a mock created service
      const newService: HostedService = {
        id: Math.max(...mockServices.map(s => s.id)) + 1,
        name: service.name,
        description: service.description,
        port: service.port,
        status: 'healthy',
        dockerImage: service.dockerImage,
        healthCheckUrl: service.healthCheckUrl,
        hostAddress: service.hostAddress,
        isDockerContainer: service.isDockerContainer,
        serverId: service.serverId,
        containerId: service.containerId,
        lastCheckTime: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uptime: 0,
      };
      return newService;
    }
    return this.request<HostedService>('post', '/services', service);
  }

  async updateService(id: string, service: Partial<HostedService>): Promise<HostedService> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const existingService = mockServices.find(s => s.id.toString() === id);
      if (!existingService) {
        throw new Error('Service not found');
      }
      return { ...existingService, ...service, updatedAt: new Date().toISOString() };
    }
    return this.request<HostedService>('put', `/services/${id}`, service);
  }

  async deleteService(id: string): Promise<void> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      // In demo mode, just simulate deletion
      return;
    }
    return this.request<void>('delete', `/services/${id}`);
  }

  async checkServiceHealth(id: string): Promise<void> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 500));
      // In demo mode, just simulate health check
      return;
    }
    return this.request<void>('post', `/api/services/${id}/check-health`);
  }

  async getServersForServices(): Promise<ServerSummary[]> {
    return this.request<ServerSummary[]>('get', '/services/servers');
  }
}

export const apiClient = new ServicesApiClient();