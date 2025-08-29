import type {ServiceStatus} from "./ServiceStatus.ts";

// Re-export ServiceStatus so it's available to other modules
export type { ServiceStatus } from "./ServiceStatus.ts";

export interface HostedService {
  id: number;
  name: string;
  description?: string;
  port?: number;
  status: ServiceStatus;
  dockerImage?: string;
  healthCheckUrl?: string;
  hostAddress?: string;
  isDockerContainer?: boolean;
  serverId?: number;
  containerId?: string;
  lastCheckTime?: string;
  createdAt?: string;
  updatedAt?: string;
  uptime?: number;
}

export interface CreateServiceDto {
  name: string;
  description?: string;
  port?: number;
  dockerImage?: string;
  serviceUrl?: string;
  healthCheckUrl?: string;
  hostAddress?: string;
  isDockerContainer?: boolean;
  serverId?: number;
  containerId?: string;
  environment?: string;
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