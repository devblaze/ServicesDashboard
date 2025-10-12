import { BaseApiClient } from './BaseApiClient';
import type {
  GitRepository,
  SyncRepositoriesRequest,
  SyncRepositoriesResponse,
  GitBranch,
} from '../types/Deployment';

class GitRepositoriesApiClient extends BaseApiClient {
  constructor() {
    super({ serviceName: 'Git Repositories API' });
  }

  async getAllRepositories(providerId?: number): Promise<GitRepository[]> {
    const params = providerId ? { ProviderId: providerId } : undefined;
    return this.request<GitRepository[]>('get', '/repositories', undefined, params);
  }

  async syncRepositories(data: SyncRepositoriesRequest): Promise<SyncRepositoriesResponse> {
    return this.request<SyncRepositoriesResponse>('post', '/repositories/sync', data);
  }

  async getRepositoryBranches(repositoryId: number): Promise<GitBranch[]> {
    return this.request<GitBranch[]>('get', `/repositories/${repositoryId}/branches`);
  }
}

export const gitRepositoriesApi = new GitRepositoriesApiClient();
