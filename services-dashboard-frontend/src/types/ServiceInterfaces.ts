import { ServiceStatus } from "./ServiceStatus";

export interface HostedService {
  id: string;
  name: string;
  description?: string;
  dockerImage?: string;
  status: ServiceStatus;
  port?: number;
  healthCheckUrl?: string;
  environment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceDto {
  name: string;
  description?: string;
  dockerImage?: string;
  port?: number;
  healthCheckUrl?: string;
  environment?: string;
}