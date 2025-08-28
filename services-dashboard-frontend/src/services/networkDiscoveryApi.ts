import { BaseApiClient } from './BaseApiClient';
import type { DiscoveredService } from '../types/networkDiscovery';

export interface NetworkScanRequest {
  networkRange: string;
  ports?: number[];
}

export interface HostScanRequest {
  hostAddress: string;
  ports?: number[];
}

export interface AddToServicesRequest {
  name: string;
  description: string;
  hostAddress: string;
  port: number;
  serviceType: string;
  banner?: string;
}

export interface OllamaSettings {
  baseUrl: string;
  model: string;
  enableServiceRecognition: boolean;
  enableScreenshots: boolean;
  timeoutSeconds: number;
}

class NetworkDiscoveryApiClient extends BaseApiClient {
  constructor() {
    super({ serviceName: 'Network Discovery API' });
  }

  async getCommonPorts(): Promise<number[]> {
    return this.request<number[]>('get', '/networkdiscovery/common-ports');
  }

  async scanNetwork(request: NetworkScanRequest): Promise<DiscoveredService[]> {
    return this.request<DiscoveredService[]>('post', '/networkdiscovery/scan-network', request);
  }

  async scanHost(request: HostScanRequest): Promise<DiscoveredService[]> {
    return this.request<DiscoveredService[]>('post', '/networkdiscovery/scan-host', request);
  }

  async addToServices(request: AddToServicesRequest): Promise<any> {
    return this.request<any>('post', '/networkdiscovery/add-to-services', request);
  }
}

class SettingsApiClient extends BaseApiClient {
  constructor() {
    super({ serviceName: 'Settings API' });
  }

  async getOllamaSettings(): Promise<OllamaSettings> {
    return this.request<OllamaSettings>('get', '/settings/ollama');
  }

  async updateOllamaSettings(settings: OllamaSettings): Promise<boolean> {
    return this.request<boolean>('put', '/settings/ollama', settings);
  }
}

export const networkDiscoveryApi = new NetworkDiscoveryApiClient();
export const settingsApi = new SettingsApiClient();