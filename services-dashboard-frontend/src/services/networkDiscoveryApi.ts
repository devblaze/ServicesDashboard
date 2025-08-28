import { BaseApiClient } from './BaseApiClient';
import type {
  StartScanRequest,
  QuickScanRequest,
  NetworkScanRequest,
  HostScanRequest,
  AddToServicesRequest,
  DiscoveredService,
  StoredDiscoveredService,
  NetworkScanSession,
  ScanStatus,
  ScanProgress,
  OllamaSettings
} from '../types/networkDiscovery';

class NetworkDiscoveryApiClient extends BaseApiClient {
  constructor() {
    super({ serviceName: 'Network Discovery API' });
  }

  async getCommonPorts(): Promise<number[]> {
    return this.request<number[]>('get', '/networkdiscovery/common-ports');
  }

  // Background scanning methods
  async startScan(request: StartScanRequest): Promise<{ scanId: string; message: string }> {
    return this.request<{ scanId: string; message: string }>('post', '/networkdiscovery/start-scan', request);
  }

  async getScanStatus(scanId: string): Promise<ScanStatus> {
    return this.request<ScanStatus>('get', `/networkdiscovery/scan-status/${scanId}`);
  }

  async getScanProgress(scanId: string): Promise<ScanProgress> {
    return this.request<ScanProgress>('get', `/networkdiscovery/scan-progress/${scanId}`);
  }

  async getScanResults(scanId: string): Promise<StoredDiscoveredService[]> {
    return this.request<StoredDiscoveredService[]>('get', `/networkdiscovery/scan-results/${scanId}`);
  }

  async getRecentScans(limit: number = 10): Promise<NetworkScanSession[]> {
    return this.request<NetworkScanSession[]>('get', `/networkdiscovery/recent-scans?limit=${limit}`);
  }

  async getLatestResults(target: string): Promise<StoredDiscoveredService[]> {
    return this.request<StoredDiscoveredService[]>('get', `/networkdiscovery/latest-results/${encodeURIComponent(target)}`);
  }

  // Quick scan for immediate results
  async quickScan(request: QuickScanRequest): Promise<DiscoveredService[]> {
    return this.request<DiscoveredService[]>('post', '/networkdiscovery/quick-scan', request);
  }

  // Legacy methods (kept for backwards compatibility)
  async scanNetwork(request: NetworkScanRequest): Promise<DiscoveredService[]> {
    return this.quickScan({ target: request.networkRange });
  }

  async scanHost(request: HostScanRequest): Promise<DiscoveredService[]> {
    return this.quickScan({ target: request.hostAddress });
  }

  async addToServices(request: AddToServicesRequest): Promise<{ id: number; message: string }> {
    return this.request<{ id: number; message: string }>('post', '/networkdiscovery/add-to-services', request);
  }
}

class SettingsApiClient extends BaseApiClient {
  constructor() {
    super({ serviceName: 'Settings API' });
  }

  async getOllamaSettings(): Promise<OllamaSettings> {
    return this.request<OllamaSettings>('get', '/settings/ollama');
  }

  async updateOllamaSettings(settings: OllamaSettings): Promise<OllamaSettings> {
    return this.request<OllamaSettings>('post', '/settings/ollama', settings);
  }

  async testOllamaConnection(): Promise<boolean> {
    return this.request<boolean>('post', '/settings/ollama/test');
  }

  async getAvailableModels(): Promise<string[]> {
    return this.request<string[]>('get', '/settings/ollama/models');
  }
}

// Export singleton instances
export const networkDiscoveryApi = new NetworkDiscoveryApiClient();
export const settingsApi = new SettingsApiClient();