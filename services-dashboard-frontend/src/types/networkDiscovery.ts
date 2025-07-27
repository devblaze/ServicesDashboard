export interface DiscoveredService {
  hostAddress: string;
  hostName: string;
  port: number;
  isReachable: boolean;
  serviceType: string;
  banner?: string;
  responseTime: string; // TimeSpan as ISO string
  discoveredAt: string; // DateTime as ISO string
}

export interface NetworkScanRequest {
  networkRange: string;
  ports?: number[];
}

export interface HostScanRequest {
  hostAddress: string;
  ports?: number[];
}

export interface AddDiscoveredServiceRequest {
  name: string;
  description?: string;
  hostAddress: string;
  port: number;
  serviceType: string;
  banner?: string;
}

// Also export as default for compatibility
export default {
  DiscoveredService: {} as DiscoveredService,
  NetworkScanRequest: {} as NetworkScanRequest,
  HostScanRequest: {} as HostScanRequest,
  AddDiscoveredServiceRequest: {} as AddDiscoveredServiceRequest
};