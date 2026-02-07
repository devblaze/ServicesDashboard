import { BaseApiClient } from './BaseApiClient';
import type {
  DatabaseConfiguration,
  DatabaseStatus,
  TestConnectionRequest,
  TestConnectionResponse,
  MigrateDatabaseRequest,
  MigrateDatabaseResponse,
  DatabaseExportResponse,
  DatabaseImportRequest,
  DatabaseImportResponse,
  GenerateSyncTokenResponse,
  RemoteSyncRequest,
  RemoteSyncResponse
} from '../types/database';

class DatabaseApi extends BaseApiClient {
  constructor() {
    super({ serviceName: 'Database' });
  }

  async getDatabaseStatus(): Promise<DatabaseStatus> {
    return await this.request<DatabaseStatus>('get', '/database/status');
  }

  async getDatabaseConfiguration(): Promise<DatabaseConfiguration> {
    return await this.request<DatabaseConfiguration>('get', '/database/configuration');
  }

  async testConnection(request: TestConnectionRequest): Promise<TestConnectionResponse> {
    return await this.request<TestConnectionResponse>('post', '/database/test-connection', request);
  }

  async migrateDatabase(request: MigrateDatabaseRequest): Promise<MigrateDatabaseResponse> {
    return await this.request<MigrateDatabaseResponse>('post', '/database/migrate', request);
  }

  async exportDatabase(): Promise<DatabaseExportResponse> {
    return await this.request<DatabaseExportResponse>('get', '/database/export');
  }

  async importDatabase(request: DatabaseImportRequest): Promise<DatabaseImportResponse> {
    return await this.request<DatabaseImportResponse>('post', '/database/import', request);
  }

  async generateSyncToken(): Promise<GenerateSyncTokenResponse> {
    return await this.request<GenerateSyncTokenResponse>('post', '/database/generate-sync-token');
  }

  async remoteSync(request: RemoteSyncRequest): Promise<RemoteSyncResponse> {
    return await this.request<RemoteSyncResponse>('post', '/database/remote-sync', request);
  }
}

const databaseApiInstance = new DatabaseApi();

export const databaseApi = {
  getDatabaseStatus: (): Promise<DatabaseStatus> => {
    return databaseApiInstance.getDatabaseStatus();
  },

  getDatabaseConfiguration: (): Promise<DatabaseConfiguration> => {
    return databaseApiInstance.getDatabaseConfiguration();
  },

  testConnection: (request: TestConnectionRequest): Promise<TestConnectionResponse> => {
    return databaseApiInstance.testConnection(request);
  },

  migrateDatabase: (request: MigrateDatabaseRequest): Promise<MigrateDatabaseResponse> => {
    return databaseApiInstance.migrateDatabase(request);
  },

  exportDatabase: (): Promise<DatabaseExportResponse> => {
    return databaseApiInstance.exportDatabase();
  },

  importDatabase: (request: DatabaseImportRequest): Promise<DatabaseImportResponse> => {
    return databaseApiInstance.importDatabase(request);
  },

  generateSyncToken: (): Promise<GenerateSyncTokenResponse> => {
    return databaseApiInstance.generateSyncToken();
  },

  remoteSync: (request: RemoteSyncRequest): Promise<RemoteSyncResponse> => {
    return databaseApiInstance.remoteSync(request);
  }
};
