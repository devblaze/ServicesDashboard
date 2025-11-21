import { BaseApiClient } from './BaseApiClient';
import type {
  AllServersMetricsResponse,
  ServerContainersMetricsResponse,
  ContainerMetricsHistoryResponse,
} from '../types/Metrics';

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
}

export const metricsApi = new MetricsApiClient();
