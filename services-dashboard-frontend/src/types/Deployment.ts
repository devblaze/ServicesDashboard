// Git Provider Types
export interface GitProviderConnection {
  id: number;
  name: string;
  providerType: GitProviderType;
  baseUrl: string;
  isActive: boolean;
  createdAt: string;
  repositoryCount?: number;
}

export interface CreateGitProviderRequest {
  name: string;
  providerType: GitProviderType;
  baseUrl: string;
  accessToken: string;
}

export interface UpdateGitProviderRequest {
  name: string;
  baseUrl: string;
  accessToken?: string;
  isActive: boolean;
}

export interface TestGitProviderRequest {
  providerType: GitProviderType;
  baseUrl: string;
  accessToken: string;
}

export interface TestGitProviderResponse {
  isSuccessful: boolean;
  message: string;
  userInfo?: string;
}

// Git Repository Types
export interface GitRepository {
  id: number;
  gitProviderConnectionId: number;
  providerName: string;
  fullName: string;
  name: string;
  description?: string;
  cloneUrl: string;
  webUrl?: string;
  defaultBranch?: string;
  isPrivate: boolean;
  lastSyncedAt?: string;
  createdAt: string;
}

export interface SyncRepositoriesRequest {
  gitProviderConnectionId: number;
}

export interface SyncRepositoriesResponse {
  syncedCount: number;
  addedCount: number;
  updatedCount: number;
  repositories: GitRepository[];
}

export interface GitBranch {
  name: string;
  isDefault: boolean;
  lastCommitSha?: string;
  lastCommitMessage?: string;
}

// Deployment Types
export interface Deployment {
  id: number;
  gitRepositoryId?: number; // Optional for manual deployments
  repositoryName?: string;
  serverId: number;
  serverName: string;
  name: string;
  type: DeploymentType;
  status: DeploymentStatus;
  deploymentSource: DeploymentSource; // Git or Manual
  branch?: string;
  tag?: string;
  dockerComposeFile?: string;
  dockerComposeFileContent?: string; // For manual deployments
  dockerfile?: string;
  buildContext?: string;
  environmentVariables?: Record<string, string>;
  portMappings?: PortMapping[];
  volumeMappings?: VolumeMapping[];
  autoDeploy: boolean;
  deploymentPath?: string;
  aiSuggestions?: AiDeploymentSuggestions;
  lastDeployedAt?: string;
  createdAt: string;
  environments: DeploymentEnvironment[];
  allocatedPorts: PortAllocation[];
}

export interface CreateDeploymentRequest {
  gitRepositoryId?: number; // Optional for manual deployments
  serverId: number;
  name: string;
  type: DeploymentType;
  deploymentSource: DeploymentSource; // Git or Manual
  branch?: string;
  tag?: string;
  dockerComposeFile?: string;
  dockerComposeFileContent?: string; // For manual deployments with inline content
  dockerfile?: string;
  buildContext?: string;
  environmentVariables?: Record<string, string>;
  portMappings?: PortMapping[];
  volumeMappings?: VolumeMapping[];
  autoDeploy: boolean;
  deploymentPath?: string; // Required for manual deployments
}

export interface UpdateDeploymentRequest {
  name: string;
  branch?: string;
  tag?: string;
  environmentVariables?: Record<string, string>;
  portMappings?: PortMapping[];
  volumeMappings?: VolumeMapping[];
  autoDeploy: boolean;
}

export interface ExecuteDeploymentRequest {
  deploymentId: number;
  environmentId?: number;
}

export interface ExecuteDeploymentResponse {
  success: boolean;
  message: string;
  deploymentLog?: string;
}

// Deployment Environment Types
export interface DeploymentEnvironment {
  id: number;
  deploymentId: number;
  name: string;
  type: EnvironmentType;
  environmentVariables?: Record<string, string>;
  portMappings?: PortMapping[];
  branch?: string;
  tag?: string;
  isActive: boolean;
  lastDeployedAt?: string;
  createdAt: string;
}

export interface CreateDeploymentEnvironmentRequest {
  deploymentId: number;
  name: string;
  type: EnvironmentType;
  environmentVariables?: Record<string, string>;
  portMappings?: PortMapping[];
  branch?: string;
  tag?: string;
}

export interface UpdateDeploymentEnvironmentRequest {
  name: string;
  environmentVariables?: Record<string, string>;
  portMappings?: PortMapping[];
  branch?: string;
  tag?: string;
  isActive: boolean;
}

// Port and Volume Types
export interface PortMapping {
  hostPort: number;
  containerPort: number;
  protocol: string;
}

export interface VolumeMapping {
  hostPath: string;
  containerPath: string;
  mode: string;
}

// Port Allocation Types
export interface PortAllocation {
  id: number;
  serverId: number;
  deploymentId: number;
  port: number;
  serviceName?: string;
  description?: string;
  isActive: boolean;
  allocatedAt: string;
}

export interface AllocatePortRequest {
  serverId: number;
  deploymentId: number;
  preferredPort?: number;
  serviceName?: string;
  description?: string;
}

export interface AllocatePortResponse {
  allocatedPort: number;
  message: string;
}

// AI Suggestions Types
export interface AiDeploymentSuggestions {
  recommendedType: string;
  dockerComposeFile?: string;
  dockerfile?: string;
  suggestedPorts: PortMapping[];
  suggestedEnvironmentVariables: Record<string, string>;
  suggestedVolumes: VolumeMapping[];
  buildContext?: string;
  confidence: number;
  reasoning?: string;
}

export interface GenerateDeploymentSuggestionsRequest {
  repositoryId: number;
  serverId: number;
  branch?: string;
}

// Enums as string literal types
export type GitProviderType = 'GitHub' | 'GitLab' | 'Gitea';

export type DeploymentType = 'DockerCompose' | 'Docker' | 'Kubernetes' | 'Script';

export type DeploymentSource = 'Git' | 'Manual';

export type DeploymentStatus =
  | 'Created'
  | 'Building'
  | 'Deploying'
  | 'Running'
  | 'Stopped'
  | 'Failed'
  | 'Updating';

export type EnvironmentType =
  | 'Production'
  | 'Staging'
  | 'Development'
  | 'UAT'
  | 'Testing'
  | 'Custom';

// Constants for iteration and validation
export const GIT_PROVIDER_TYPES: GitProviderType[] = ['GitHub', 'GitLab', 'Gitea'];

export const DEPLOYMENT_TYPES: DeploymentType[] = ['DockerCompose', 'Docker', 'Kubernetes', 'Script'];

export const DEPLOYMENT_STATUSES: DeploymentStatus[] = [
  'Created',
  'Building',
  'Deploying',
  'Running',
  'Stopped',
  'Failed',
  'Updating'
];

export const ENVIRONMENT_TYPES: EnvironmentType[] = [
  'Production',
  'Staging',
  'Development',
  'UAT',
  'Testing',
  'Custom'
];
