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
  constructor() {
    super({ serviceName: 'Servers API' });
  }

  async getServers(): Promise<ServerConnection[]> {
    return this.request<ServerConnection[]>('get', '/servers');
  }

  async getServer(id: string): Promise<ServerConnection> {
    return this.request<ServerConnection>('get', `/servers/${id}`);
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

    return this.request<ServerConnection>('post', '/servers', connectionDto);
  }

  async updateServer(id: string, data: ServerConnectionDto): Promise<ServerConnection> {
    return this.request<ServerConnection>('put', `/servers/${id}`, data);
  }

  async deleteServer(id: string): Promise<void> {
    return this.request<void>('delete', `/servers/${id}`);
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

    const success = await this.request<boolean>('post', '/servers/test', connectionDto);
    return {
      success,
      message: success ? 'Connection successful' : 'Connection failed'
    };
  }

  async testServerConnection(id: string): Promise<boolean> {
    return this.request<boolean>('post', `/servers/${id}/test`);
  }
}

export const serversApi = new ServersApi();