import { BaseApiClient } from './BaseApiClient';
import type {
  Deployment,
  CreateDeploymentRequest,
  UpdateDeploymentRequest,
  ExecuteDeploymentRequest,
  ExecuteDeploymentResponse,
  DeploymentEnvironment,
  CreateDeploymentEnvironmentRequest,
  UpdateDeploymentEnvironmentRequest,
  AiDeploymentSuggestions,
  GenerateDeploymentSuggestionsRequest,
} from '../types/Deployment';
import { mockDeployments } from '../mocks/mockDeployments';

const isDemoMode = () => import.meta.env.VITE_DEMO_MODE === 'true';

class DeploymentsApiClient extends BaseApiClient {
  constructor() {
    super({ serviceName: 'Deployments API' });
  }

  // Deployment endpoints
  async getAllDeployments(serverId?: number, repositoryId?: number): Promise<Deployment[]> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 500));
      let filtered = mockDeployments;
      if (serverId) filtered = filtered.filter(d => d.serverId === serverId);
      if (repositoryId) filtered = filtered.filter(d => d.gitRepositoryId === repositoryId);
      return filtered;
    }

    const params: Record<string, number> = {};
    if (serverId) params.ServerId = serverId;
    if (repositoryId) params.RepositoryId = repositoryId;

    return this.request<Deployment[]>('get', '/deployments', undefined, Object.keys(params).length > 0 ? params : undefined);
  }

  async getDeployment(id: number): Promise<Deployment> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const deployment = mockDeployments.find(d => d.id === id);
      if (!deployment) throw new Error('Deployment not found');
      return deployment;
    }
    return this.request<Deployment>('get', `/deployments/${id}`);
  }

  async createDeployment(data: CreateDeploymentRequest): Promise<Deployment> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 800));
      const newDeployment: Deployment = {
        id: Math.max(...mockDeployments.map(d => d.id)) + 1,
        ...data,
        repositoryName: data.gitRepositoryId ? `Repository ${data.gitRepositoryId}` : undefined,
        serverName: `Server ${data.serverId}`,
        status: 'Created',
        createdAt: new Date().toISOString(),
        environments: [],
        allocatedPorts: [],
      };
      console.log('Demo mode: created deployment', newDeployment);
      return newDeployment;
    }
    return this.request<Deployment>('post', '/deployments', data);
  }

  async updateDeployment(id: number, data: UpdateDeploymentRequest): Promise<Deployment> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 600));
      const deployment = mockDeployments.find(d => d.id === id);
      if (!deployment) throw new Error('Deployment not found');
      return { ...deployment, ...data };
    }
    return this.request<Deployment>('put', `/deployments/${id}`, data);
  }

  async deleteDeployment(id: number): Promise<void> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Demo mode: deleted deployment', id);
      return;
    }
    return this.request<void>('delete', `/deployments/${id}`);
  }

  async executeDeployment(data: ExecuteDeploymentRequest): Promise<ExecuteDeploymentResponse> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Demo mode: executed deployment', data);
      return {
        success: true,
        message: 'Deployment started successfully in demo mode',
        deploymentLog: 'Building...\nPulling images...\nStarting containers...\nDeployment complete!',
      };
    }
    return this.request<ExecuteDeploymentResponse>(
      'post',
      `/deployments/${data.deploymentId}/execute`,
      data
    );
  }

  async stopDeployment(id: number): Promise<{ message: string }> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Demo mode: stopped deployment', id);
      return { message: 'Deployment stopped successfully in demo mode' };
    }
    return this.request<{ message: string }>('post', `/deployments/${id}/stop`, { id });
  }

  // Environment endpoints
  async getAllEnvironments(deploymentId: number): Promise<DeploymentEnvironment[]> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const deployment = mockDeployments.find(d => d.id === deploymentId);
      return deployment?.environments || [];
    }
    return this.request<DeploymentEnvironment[]>('get', `/deployments/${deploymentId}/environments`);
  }

  async getEnvironment(deploymentId: number, id: number): Promise<DeploymentEnvironment> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const deployment = mockDeployments.find(d => d.id === deploymentId);
      const environment = deployment?.environments.find(e => e.id === id);
      if (!environment) throw new Error('Environment not found');
      return environment;
    }
    return this.request<DeploymentEnvironment>('get', `/deployments/${deploymentId}/environments/${id}`);
  }

  async createEnvironment(data: CreateDeploymentEnvironmentRequest): Promise<DeploymentEnvironment> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 600));
      const newEnv: DeploymentEnvironment = {
        id: Date.now(),
        ...data,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      console.log('Demo mode: created environment', newEnv);
      return newEnv;
    }
    return this.request<DeploymentEnvironment>(
      'post',
      `/deployments/${data.deploymentId}/environments`,
      data
    );
  }

  async updateEnvironment(
    deploymentId: number,
    id: number,
    data: UpdateDeploymentEnvironmentRequest
  ): Promise<DeploymentEnvironment> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 400));
      const deployment = mockDeployments.find(d => d.id === deploymentId);
      const environment = deployment?.environments.find(e => e.id === id);
      if (!environment) throw new Error('Environment not found');
      return { ...environment, ...data };
    }
    return this.request<DeploymentEnvironment>(
      'put',
      `/deployments/${deploymentId}/environments/${id}`,
      data
    );
  }

  async deleteEnvironment(deploymentId: number, id: number): Promise<void> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 400));
      console.log('Demo mode: deleted environment', deploymentId, id);
      return;
    }
    return this.request<void>('delete', `/deployments/${deploymentId}/environments/${id}`);
  }

  // AI Suggestions endpoint
  async getAiSuggestions(data: GenerateDeploymentSuggestionsRequest): Promise<AiDeploymentSuggestions> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const mockSuggestions: AiDeploymentSuggestions = {
        recommendedType: 'DockerCompose',
        dockerComposeFile: 'docker-compose.yml',
        suggestedPorts: [
          { hostPort: 3000, containerPort: 3000, protocol: 'tcp' },
        ],
        suggestedEnvironmentVariables: {
          NODE_ENV: 'production',
          PORT: '3000',
        },
        suggestedVolumes: [
          { hostPath: '/opt/app/data', containerPath: '/app/data', mode: 'rw' },
        ],
        buildContext: '.',
        confidence: 0.92,
        reasoning: 'Detected Node.js application with package.json and docker-compose.yml. Recommended Docker Compose deployment.',
      };
      return mockSuggestions;
    }
    return this.request<AiDeploymentSuggestions>('post', '/deployments/ai-suggestions', data);
  }
}

export const deploymentsApi = new DeploymentsApiClient();
