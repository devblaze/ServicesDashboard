import { BaseApiClient } from './BaseApiClient';
import type {
  DatabaseConfiguration,
  DatabaseStatus,
  TestConnectionRequest,
  TestConnectionResponse,
  MigrateDatabaseRequest,
  MigrateDatabaseResponse
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
  }
};
