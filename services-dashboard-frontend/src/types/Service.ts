import type {ServiceStatus} from "./ServiceStatus.ts";

export interface HostedService {
  id: number;
  name: string;
  description?: string;
  dockerImage?: string; // Optional for external services
  hostAddress?: string; // For external services
  port?: number;
  healthCheckUrl?: string;
  environment?: 'development' | 'staging' | 'production';
  status: ServiceStatus;
  uptime?: number;
  lastHealthCheck?: string;
  logsAvailable?: boolean; // Whether logs are accessible
  serviceType?: 'docker' | 'external';
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceDto {
  name: string;
  description?: string;
  dockerImage?: string; // Optional for external services
  hostAddress?: string; // For external services
  port?: number;
  healthCheckUrl?: string;
  environment?: 'development' | 'staging' | 'production';
}

export interface UpdateServiceDto {
  name?: string;
  description?: string;
  dockerImage?: string;
  hostAddress?: string;
  port?: number;
  healthCheckUrl?: string;
  environment?: 'development' | 'staging' | 'production';
}

export interface ServiceHealthCheck {
  id: number;
  serviceId: number;
  status: ServiceStatus;
  responseTime?: number;
  httpStatusCode?: number;
  errorMessage?: string;
  checkedAt: string;
}

export interface ServiceLog {
  id: number;
  serviceId: number;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}