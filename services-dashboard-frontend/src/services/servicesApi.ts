import axios, {type AxiosInstance, type AxiosResponse } from 'axios';
import type { HostedService, CreateServiceDto } from '../types/ServiceInterfaces';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || '/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
        (config) => {
          if (import.meta.env.DEV) {
            console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
          }
          return config;
        },
        (error) => {
          console.error('Request Error:', error);
          return Promise.reject(error);
        }
    );

    // Response interceptor
    this.client.interceptors.response.use(
        (response) => {
          if (import.meta.env.DEV) {
            console.log(`✅ ${response.status} ${response.config.url}`);
          }
          return response;
        },
        (error) => {
          const message = error.response?.data?.message || error.message;
          console.error(`❌ ${error.response?.status || 'Network'} Error:`, message);
          return Promise.reject(new Error(message));
        }
    );
  }

  // Generic request method with type safety
  private async request<T>(
      method: 'get' | 'post' | 'put' | 'delete',
      url: string,
      data?: unknown
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.client.request({
      method,
      url,
      data,
    });
    return response.data;
  }

  // Services API methods
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
    return this.request<void>('post', `/services/${id}/check-health`);
  }
}

export const apiClient = new ApiClient();