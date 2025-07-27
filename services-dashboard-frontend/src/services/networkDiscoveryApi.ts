import axios from 'axios';
import { DiscoveredService, NetworkScanRequest, HostScanRequest } from '../types/networkDiscovery';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const networkDiscoveryApi = {
  scanNetwork: async (request: NetworkScanRequest): Promise<DiscoveredService[]> => {
    const response = await axios.post(`${API_BASE_URL}/NetworkDiscovery/scan-network`, request);
    return response.data;
  },

  scanHost: async (request: HostScanRequest): Promise<DiscoveredService[]> => {
    const response = await axios.post(`${API_BASE_URL}/NetworkDiscovery/scan-host`, request);
    return response.data;
  },

  getCommonPorts: async (): Promise<number[]> => {
    const response = await axios.get(`${API_BASE_URL}/NetworkDiscovery/common-ports`);
    return response.data;
  }
};
