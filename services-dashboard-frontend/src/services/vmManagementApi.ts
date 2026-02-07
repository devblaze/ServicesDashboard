import { BaseApiClient } from './BaseApiClient';
import type {
  VMOperation,
  CreateVMRequest,
  CloudImage,
  UnraidServerInfo,
  VMPresetInfo,
} from '../types/VirtualMachine';

class VMManagementApiClient extends BaseApiClient {
  constructor() {
    super({ serviceName: 'VM Management API' });
  }

  async createVM(request: CreateVMRequest): Promise<VMOperation> {
    return this.request<VMOperation>('post', '/virtualmachines', request);
  }

  async getOperation(operationId: string): Promise<VMOperation> {
    return this.request<VMOperation>('get', `/virtualmachines/operations/${operationId}`);
  }

  async getOperations(hostServerId?: number): Promise<VMOperation[]> {
    const params = hostServerId ? `?hostServerId=${hostServerId}` : '';
    return this.request<VMOperation[]>('get', `/virtualmachines/operations${params}`);
  }

  async cancelOperation(operationId: string): Promise<void> {
    await this.client.delete(`/virtualmachines/operations/${operationId}`);
  }

  async getAvailableImages(): Promise<CloudImage[]> {
    return this.request<CloudImage[]>('get', '/virtualmachines/images');
  }

  async getUnraidServers(): Promise<UnraidServerInfo[]> {
    return this.request<UnraidServerInfo[]>('get', '/virtualmachines/unraid-servers');
  }

  async getPresets(): Promise<VMPresetInfo[]> {
    return this.request<VMPresetInfo[]>('get', '/virtualmachines/presets');
  }
}

export const vmManagementApi = new VMManagementApiClient();
