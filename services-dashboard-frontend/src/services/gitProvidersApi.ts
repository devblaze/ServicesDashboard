import { BaseApiClient } from './BaseApiClient';
import type {
  GitProviderConnection,
  CreateGitProviderRequest,
  UpdateGitProviderRequest,
  TestGitProviderRequest,
  TestGitProviderResponse,
} from '../types/Deployment';

class GitProvidersApiClient extends BaseApiClient {
  constructor() {
    super({ serviceName: 'Git Providers API' });
  }

  async getAllProviders(): Promise<GitProviderConnection[]> {
    return this.request<GitProviderConnection[]>('get', '/git-providers');
  }

  async getProvider(id: number): Promise<GitProviderConnection> {
    return this.request<GitProviderConnection>('get', `/git-providers/${id}`);
  }

  async createProvider(data: CreateGitProviderRequest): Promise<GitProviderConnection> {
    return this.request<GitProviderConnection>('post', '/git-providers', data);
  }

  async updateProvider(id: number, data: UpdateGitProviderRequest): Promise<GitProviderConnection> {
    return this.request<GitProviderConnection>('put', `/git-providers/${id}`, data);
  }

  async deleteProvider(id: number): Promise<void> {
    return this.request<void>('delete', `/git-providers/${id}`);
  }

  async testConnection(data: TestGitProviderRequest): Promise<TestGitProviderResponse> {
    return this.request<TestGitProviderResponse>('post', '/git-providers/test', data);
  }
}

export const gitProvidersApi = new GitProvidersApiClient();
