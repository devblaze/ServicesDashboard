export interface DiscoveredService {
  hostAddress: string;
  hostName: string;
  port: number;
  isReachable: boolean;
  responseTime: string | number;
  serviceType: string;
  banner?: string;
  discoveredAt: string;

  // AI Recognition fields
  recognizedName?: string;
  suggestedDescription?: string;
  serviceCategory?: string;
  suggestedIcon?: string;
  aiConfidence?: number;

  // Service-specific flags
  isSshService?: boolean;
  canAddAsServer?: boolean;
}

export interface StoredDiscoveredService extends DiscoveredService {
  id: number;
  scanId: string;
  responseTimeMs: number;
  isActive: boolean;
  serviceKey: string;
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

export interface LatestService {
  hostAddress: string;
  port: number;
  serviceType: string;
  discoveredAt: string;
}

export interface ScanProgress {
  scanId: string;
  target: string;
  scanType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  discoveredCount: number;
  latestServices: LatestService[];
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