import { BaseApiClient } from './BaseApiClient';
import type {
  AllServersMetricsResponse,
  ServerContainersMetricsResponse,
  ContainerMetricsHistoryResponse,
} from '../types/Metrics';
import type {
  ServerSystemMetricsResponse,
  ServerDiskMetricsResponse,
} from '../types/SystemMetrics';

class MetricsApiClient extends BaseApiClient {
  constructor() {
    super({ serviceName: 'Metrics API' });
  }

  /**
   * Get metrics summary for all servers
   */
  async getAllServersMetrics(minutes: number = 60): Promise<AllServersMetricsResponse> {
    return this.request<AllServersMetricsResponse>('get', '/metrics/servers', undefined, { minutes });
  }

  /**
   * Get all containers and their metrics for a specific server
   */
  async getServerContainersMetrics(
    serverId: number,
    minutes: number = 60
  ): Promise<ServerContainersMetricsResponse> {
    return this.request<ServerContainersMetricsResponse>(
      'get',
      `/metrics/servers/${serverId}/containers`,
      undefined,
      { minutes }
    );
  }

  /**
   * Get historical metrics for a specific container
   */
  async getContainerMetricsHistory(
    serverId: number,
    containerId: string,
    minutes: number = 60
  ): Promise<ContainerMetricsHistoryResponse> {
    return this.request<ContainerMetricsHistoryResponse>(
      'get',
      `/metrics/servers/${serverId}/containers/${containerId}/history`,
      undefined,
      { minutes }
    );
  }

  /**
   * Get system metrics for a server (network bandwidth, temperatures)
   */
  async getServerSystemMetrics(
    serverId: number,
    minutes: number = 60
  ): Promise<ServerSystemMetricsResponse> {
    return this.request<ServerSystemMetricsResponse>(
      'get',
      `/metrics/servers/${serverId}/system`,
      undefined,
      { minutes }
    );
  }

  /**
   * Get disk metrics for a server (array, cache, system disks)
   */
  async getServerDiskMetrics(
    serverId: number,
    minutes: number = 60
  ): Promise<ServerDiskMetricsResponse> {
    return this.request<ServerDiskMetricsResponse>(
      'get',
      `/metrics/servers/${serverId}/disks`,
      undefined,
      { minutes }
    );
  }
}

export const metricsApi = new MetricsApiClient();
