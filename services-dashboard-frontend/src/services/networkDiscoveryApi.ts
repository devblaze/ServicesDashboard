import axios from 'axios';
import type { 
  DiscoveredService, 
  NetworkScanRequest, 
  HostScanRequest, 
  AddDiscoveredServiceRequest,
  OllamaSettings 
} from '../types/networkDiscovery.js';

const API_BASE_URL = 'http://localhost:8080/api';

export const networkDiscoveryApi = {
  scanNetwork: async (request: NetworkScanRequest): Promise<DiscoveredService[]> => {
    const response = await axios.post(`${API_BASE_URL}/NetworkDiscovery/scan-network`, request);
    return response.data;
  },

  scanHost: async (request: HostScanRequest): Promise<DiscoveredService[]> => {
    const response = await axios.post(`${API_BASE_URL}/NetworkDiscovery/scan-host`, request);
    return response.data;
  },

  addToServices: async (request: AddDiscoveredServiceRequest): Promise<any> => {
    const response = await axios.post(`${API_BASE_URL}/NetworkDiscovery/add-to-services`, request);
    return response.data;
  },

  getCommonPorts: async (): Promise<number[]> => {
    const response = await axios.get(`${API_BASE_URL}/NetworkDiscovery/common-ports`);
    return response.data;
  }
};

export const settingsApi = {
  getOllamaSettings: async (): Promise<OllamaSettings> => {
    const response = await axios.get(`${API_BASE_URL}/Settings/ollama`);
    return response.data;
  },

  updateOllamaSettings: async (settings: OllamaSettings): Promise<OllamaSettings> => {
    const response = await axios.post(`${API_BASE_URL}/Settings/ollama`, settings);
    return response.data;
  },

  testOllamaConnection: async (): Promise<boolean> => {
    const response = await axios.post(`${API_BASE_URL}/Settings/ollama/test`);
    return response.data;
  },

  getAvailableModels: async (): Promise<string[]> => {
    const response = await axios.get(`${API_BASE_URL}/Settings/ollama/models`);
    return response.data;
  }
};