import { BaseApiClient } from './BaseApiClient';
import type { UpdateInfo, VersionInfo } from '../types/Update';

class UpdateApiClient extends BaseApiClient {
  constructor() {
    super({ serviceName: 'Update API' });
  }

  async checkForUpdates(): Promise<UpdateInfo> {
    return this.request<UpdateInfo>('get', '/system/updates/check');
  }

  async getCurrentVersion(): Promise<VersionInfo> {
    return this.request<VersionInfo>('get', '/system/version');
  }
}

export const updateApi = new UpdateApiClient();
