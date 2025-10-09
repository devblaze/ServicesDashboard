import { BaseApiClient } from './BaseApiClient';

export interface ServerConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: string;
  password?: string;
  privateKeyPath?: string;
  dockerEndpoint: string;
  isConnected: boolean;
  lastConnected: string;
}

export interface CreateServerRequest {
  name: string;
  description?: string;
  ipAddress: string;
  tags?: string[];
  sshPort?: number;
  sshCredentialId?: number;
  customSshUsername?: string;
  customSshPassword?: string;
}

export interface ServerConnectionDto {
  id?: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: string;
  password?: string;
  privateKeyPath?: string;
  dockerEndpoint: string;
  sshCredentialId?: number;
}

export interface TestConnectionRequest {
  hostAddress: string;
  port?: number;
  username?: string;
  password?: string;
  sshCredentialId?: number;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
}

class ServersApi extends BaseApiClient {
  async getServers(): Promise<ServerConnection[]> {
    const response = await this.axiosInstance.get<ServerConnection[]>('/servers');
    return response.data;
  }

  async getServer(id: string): Promise<ServerConnection> {
    const response = await this.axiosInstance.get<ServerConnection>(`/servers/${id}`);
    return response.data;
  }

  async createServer(data: CreateServerRequest): Promise<ServerConnection> {
    // Convert CreateServerRequest to ServerConnectionDto
    const connectionDto: ServerConnectionDto = {
      name: data.name,
      host: data.ipAddress,
      port: data.sshPort || 22,
      username: data.customSshUsername || '',
      authMethod: 'Password',
      password: data.customSshPassword,
      dockerEndpoint: 'unix:///var/run/docker.sock',
      sshCredentialId: data.sshCredentialId
    };

    const response = await this.axiosInstance.post<ServerConnection>('/servers', connectionDto);
    return response.data;
  }

  async updateServer(id: string, data: ServerConnectionDto): Promise<ServerConnection> {
    const response = await this.axiosInstance.put<ServerConnection>(`/servers/${id}`, data);
    return response.data;
  }

  async deleteServer(id: string): Promise<void> {
    await this.axiosInstance.delete(`/servers/${id}`);
  }

  async testConnection(data: TestConnectionRequest): Promise<TestConnectionResponse> {
    const connectionDto: ServerConnectionDto = {
      name: 'Test Connection',
      host: data.hostAddress,
      port: data.port || 22,
      username: data.username || '',
      authMethod: 'Password',
      password: data.password,
      dockerEndpoint: 'unix:///var/run/docker.sock',
      sshCredentialId: data.sshCredentialId
    };

    const response = await this.axiosInstance.post<boolean>('/servers/test', connectionDto);
    return {
      success: response.data,
      message: response.data ? 'Connection successful' : 'Connection failed'
    };
  }

  async testServerConnection(id: string): Promise<boolean> {
    const response = await this.axiosInstance.post<boolean>(`/servers/${id}/test`);
    return response.data;
  }
}

export const serversApi = new ServersApi();