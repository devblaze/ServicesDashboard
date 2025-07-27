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
