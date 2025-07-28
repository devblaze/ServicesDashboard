export interface DiscoveredService {
  hostAddress: string;
  port: number;
  serviceType: string;
  banner?: string;
  isResponding: boolean;
  responseTime: number;
  detectedService?: string;
  confidence?: number;
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

export interface OllamaSettings {
  baseUrl: string;
  model: string;
  enableServiceRecognition: boolean;
  enableScreenshots: boolean;
  timeoutSeconds: number;
}