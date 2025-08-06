export interface DiscoveredService {
  hostAddress: string;
  hostName: string;
  port: number;
  isReachable: boolean;
  responseTime: string | number; // Can be TimeSpan format or number
  serviceType: string;
  banner?: string;
  discoveredAt: string;
}

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