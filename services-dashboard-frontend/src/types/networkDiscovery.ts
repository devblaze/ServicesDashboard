export interface DiscoveredService {
  hostAddress: string;
  hostName: string;
  port: number;
  isReachable: boolean;
  responseTime: string | number;
  serviceType: string;
  banner?: string;
  discoveredAt: string;
  lastSeenAt?: string;
  isActive?: boolean;
}

export interface StoredDiscoveredService {
  id: number;
  scanSessionId: string;
  hostAddress: string;
  hostName: string;
  port: number;
  isReachable: boolean;
  serviceType: string;
  banner?: string;
  responseTime: string;
  discoveredAt: string;
  lastSeenAt: string;
  isActive: boolean;
}

export interface NetworkScanSession {
  id: string;
  target: string;
  scanType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  totalHosts: number;
  scannedHosts: number;
  totalPorts: number;
  scannedPorts: number;
  errorMessage?: string;
  serviceCount?: number;
}

export interface ScanStatus {
  scanId: string;
  target: string;
  scanType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  serviceCount: number;
  errorMessage?: string;
}

export interface StartScanRequest {
  target: string;
  scanType: string;
  ports?: number[];
  fullScan: boolean;
}

export interface NetworkScanRequest {
  networkRange: string;
  ports?: number[];
}

export interface HostScanRequest {
  hostAddress: string;
  ports?: number[];
}

export interface QuickScanRequest {
  target: string;
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

// Add the missing ScanMode type
export type ScanMode = 'quick' | 'background';