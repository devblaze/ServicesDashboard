import axios from 'axios';
import type { DiscoveredService } from '../types/networkDiscovery';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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

export const networkDiscoveryApi = {
  getCommonPorts: async (): Promise<number[]> => {
    const response = await axios.get(`${API_BASE_URL}/networkdiscovery/common-ports`);
    return response.data;
  },

  scanNetwork: async (request: NetworkScanRequest): Promise<DiscoveredService[]> => {
    const response = await axios.post(`${API_BASE_URL}/networkdiscovery/scan-network`, request);
    return response.data;
  },

  scanHost: async (request: HostScanRequest): Promise<DiscoveredService[]> => {
    const response = await axios.post(`${API_BASE_URL}/networkdiscovery/scan-host`, request);
    return response.data;
  },

  addToServices: async (request: AddToServicesRequest): Promise<any> => {
    const response = await axios.post(`${API_BASE_URL}/networkdiscovery/add-to-services`, request);
    return response.data;
  }
};

export const settingsApi = {
  getOllamaSettings: async (): Promise<OllamaSettings> => {
    const response = await axios.get(`${API_BASE_URL}/settings/ollama`);
    return response.data;
  },

  updateOllamaSettings: async (settings: OllamaSettings): Promise<boolean> => {
    const response = await axios.put(`${API_BASE_URL}/settings/ollama`, settings);
    return response.data;
  }
};