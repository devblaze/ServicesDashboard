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

class DeploymentsApiClient extends BaseApiClient {
  constructor() {
    super({ serviceName: 'Deployments API' });
  }

  // Deployment endpoints
  async getAllDeployments(serverId?: number, repositoryId?: number): Promise<Deployment[]> {
    const params: Record<string, number> = {};
    if (serverId) params.ServerId = serverId;
    if (repositoryId) params.RepositoryId = repositoryId;

    return this.request<Deployment[]>('get', '/deployments', undefined, Object.keys(params).length > 0 ? params : undefined);
  }

  async getDeployment(id: number): Promise<Deployment> {
    return this.request<Deployment>('get', `/deployments/${id}`);
  }

  async createDeployment(data: CreateDeploymentRequest): Promise<Deployment> {
    return this.request<Deployment>('post', '/deployments', data);
  }

  async updateDeployment(id: number, data: UpdateDeploymentRequest): Promise<Deployment> {
    return this.request<Deployment>('put', `/deployments/${id}`, data);
  }

  async deleteDeployment(id: number): Promise<void> {
    return this.request<void>('delete', `/deployments/${id}`);
  }

  async executeDeployment(data: ExecuteDeploymentRequest): Promise<ExecuteDeploymentResponse> {
    return this.request<ExecuteDeploymentResponse>(
      'post',
      `/deployments/${data.deploymentId}/execute`,
      data
    );
  }

  async stopDeployment(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>('post', `/deployments/${id}/stop`, { id });
  }

  // Environment endpoints
  async getAllEnvironments(deploymentId: number): Promise<DeploymentEnvironment[]> {
    return this.request<DeploymentEnvironment[]>('get', `/deployments/${deploymentId}/environments`);
  }

  async getEnvironment(deploymentId: number, id: number): Promise<DeploymentEnvironment> {
    return this.request<DeploymentEnvironment>('get', `/deployments/${deploymentId}/environments/${id}`);
  }

  async createEnvironment(data: CreateDeploymentEnvironmentRequest): Promise<DeploymentEnvironment> {
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
    return this.request<DeploymentEnvironment>(
      'put',
      `/deployments/${deploymentId}/environments/${id}`,
      data
    );
  }

  async deleteEnvironment(deploymentId: number, id: number): Promise<void> {
    return this.request<void>('delete', `/deployments/${deploymentId}/environments/${id}`);
  }

  // AI Suggestions endpoint
  async getAiSuggestions(data: GenerateDeploymentSuggestionsRequest): Promise<AiDeploymentSuggestions> {
    return this.request<AiDeploymentSuggestions>('post', '/deployments/ai-suggestions', data);
  }
}

export const deploymentsApi = new DeploymentsApiClient();
