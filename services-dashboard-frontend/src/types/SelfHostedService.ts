export type SelfHostedServiceType = 'DockerContainer' | 'Deployment';

export type ServiceStatus = 'running' | 'stopped' | 'building' | 'deploying' | 'failed' | 'unknown';

export interface PortMappingInfo {
  privatePort: number;
  publicPort?: number;
  type: string;
  ip?: string;
}

export interface SelfHostedService {
  id: string; // Composite: type-serverId-id
  type: SelfHostedServiceType;
  name: string;
  status: string;
  serverId: number;
  serverName: string;

  // Docker-specific properties
  containerId?: string;
  image?: string;
  imageTag?: string;
  ports?: PortMappingInfo[];

  // Deployment-specific properties
  deploymentId?: number;
  deploymentType?: string;
  branch?: string;
  repositoryName?: string;
  autoDeploy?: boolean;
  lastDeployedAt?: string;

  // Common properties
  iconUrl?: string;
  customIconData?: string;
  createdAt: string;
  tags: string[];
  url?: string;
}

export interface SelfHostedServiceFilters {
  type?: SelfHostedServiceType;
  status?: string;
  serverId?: number;
  repositoryId?: number;
  searchTerm?: string;
}

// Git Provider types
export type GitProviderType = 'GitHub' | 'Gitea' | 'GitLab';

export interface GitProvider {
  id: number;
  type: GitProviderType;
  name: string;
  baseUrl: string;
  accessToken?: string;
  webhookSecret?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GitRepository {
  id: number;
  gitProviderId: number;
  name: string;
  fullName: string;
  cloneUrl: string;
  defaultBranch?: string;
  autoDeployEnabled: boolean;
  autoDeployBranchPattern?: string;
  defaultServerId?: number;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface GitBranch {
  id: number;
  repositoryId: number;
  name: string;
  commitSha: string;
  hasAutoDeployment: boolean;
  deploymentId?: number;
  lastCommitAt: string;
  detectedAt: string;
  updatedAt: string;
}

// Port Management types
export type PortAllocationStatus = 'Available' | 'Reserved' | 'InUse' | 'SystemReserved';
export type PortAllocationType = 'Docker' | 'Deployment' | 'System' | 'Manual';

export interface PortAllocation {
  id: number;
  serverId: number;
  port: number;
  status: PortAllocationStatus;
  allocationType: PortAllocationType;
  serviceId?: string;
  serviceName?: string;
  allocatedAt?: string;
  releasedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortConflict {
  port: number;
  conflictType: string;
  conflictsWith: string;
}

export interface PortConflictResult {
  hasConflicts: boolean;
  conflicts: PortConflict[];
  suggestedPorts: number[];
}

export interface PortSuggestionRequest {
  serverId: number;
  count: number;
  preferredRangeStart?: number;
  preferredRangeEnd?: number;
}

export interface PortAllocationRequest {
  serverId: number;
  port: number;
  allocationType: PortAllocationType;
  serviceId?: string;
  serviceName?: string;
}
