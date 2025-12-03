export type DatabaseProvider = 'SQLite' | 'PostgreSQL' | 'SqlServer';

export interface DatabaseConfiguration {
  id: number;
  provider: DatabaseProvider;
  sqlitePath?: string;
  postgreSQLHost?: string;
  postgreSQLPort: number;
  postgreSQLDatabase?: string;
  postgreSQLUsername?: string;
  sqlServerHost?: string;
  sqlServerPort: number;
  sqlServerDatabase?: string;
  sqlServerUsername?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseStatus {
  provider: DatabaseProvider;
  isConnected: boolean;
  connectionString: string;
  databaseSizeMB?: number;
  totalTables: number;
  totalRecords: number;
  requiresSetup: boolean;
  serverVersion?: string;
}

export interface TestConnectionRequest {
  provider: DatabaseProvider;
  sqlitePath?: string;
  postgreSQLHost?: string;
  postgreSQLPort?: number;
  postgreSQLDatabase?: string;
  postgreSQLUsername?: string;
  postgreSQLPassword?: string;
  sqlServerHost?: string;
  sqlServerPort?: number;
  sqlServerDatabase?: string;
  sqlServerUsername?: string;
  sqlServerPassword?: string;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  error?: string;
  serverVersion?: string;
  responseTimeMs?: number;
}

export interface MigrateDatabaseRequest {
  targetProvider: 'PostgreSQL' | 'SqlServer';
  postgreSQLHost?: string;
  postgreSQLPort?: number;
  postgreSQLDatabase?: string;
  postgreSQLUsername?: string;
  postgreSQLPassword?: string;
  sqlServerHost?: string;
  sqlServerPort?: number;
  sqlServerDatabase?: string;
  sqlServerUsername?: string;
  sqlServerPassword?: string;
}

export interface MigrateDatabaseResponse {
  success: boolean;
  message: string;
  tablesCreated: number;
  recordsMigrated: number;
  error?: string;
}
