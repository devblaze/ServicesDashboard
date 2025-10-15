import { BaseApiClient } from './BaseApiClient';

export interface SshCredential {
  id: number;
  name: string;
  username: string;
  description?: string;
  defaultPort?: number;
  isDefault: boolean;
  createdAt: string;
  usageCount?: number;
}

export interface CreateSshCredentialRequest {
  name: string;
  username: string;
  password: string;
  description?: string;
  defaultPort?: number;
  isDefault?: boolean;
}

export interface UpdateSshCredentialRequest {
  name?: string;
  username?: string;
  password?: string;
  description?: string;
  defaultPort?: number;
  isDefault?: boolean;
}

export interface TestCredentialRequest {
  hostAddress: string;
  port?: number;
}

export interface TestCredentialResponse {
  success: boolean;
  message: string;
}

class SshCredentialsApi extends BaseApiClient {
  constructor() {
    super({ serviceName: 'SSH Credentials' });
  }

  async getCredentials(): Promise<SshCredential[]> {
    const response = await this.client.get<SshCredential[]>('/sshcredentials');
    return response.data;
  }

  async getCredential(id: number): Promise<SshCredential> {
    const response = await this.client.get<SshCredential>(`/sshcredentials/${id}`);
    return response.data;
  }

  async getDefaultCredential(): Promise<SshCredential | null> {
    try {
      const response = await this.client.get<SshCredential>('/sshcredentials/default');
      return response.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // No default credential set
      }
      throw error;
    }
  }

  async createCredential(request: CreateSshCredentialRequest): Promise<SshCredential> {
    const response = await this.client.post<SshCredential>('/sshcredentials', request);
    return response.data;
  }

  async updateCredential(id: number, request: UpdateSshCredentialRequest): Promise<void> {
    await this.client.put(`/sshcredentials/${id}`, request);
  }

  async deleteCredential(id: number): Promise<void> {
    await this.client.delete(`/sshcredentials/${id}`);
  }

  async testCredential(id: number, request: TestCredentialRequest): Promise<TestCredentialResponse> {
    const response = await this.client.post<TestCredentialResponse>(
      `/sshcredentials/${id}/test`,
      request
    );
    return response.data;
  }
}

export const sshCredentialsApi = new SshCredentialsApi();