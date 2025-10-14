export interface DatabaseConfiguration {
  id: number;
  provider: 'SQLite' | 'PostgreSQL';
  sqlitePath?: string;
  postgreSQLHost?: string;
  postgreSQLPort: number;
  postgreSQLDatabase?: string;
  postgreSQLUsername?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseStatus {
  provider: 'SQLite' | 'PostgreSQL';
  isConnected: boolean;
  connectionString: string;
  databaseSizeMB?: number;
  totalTables: number;
  totalRecords: number;
  requiresSetup: boolean;
}

export interface TestConnectionRequest {
  provider: 'SQLite' | 'PostgreSQL';
  sqlitePath?: string;
  postgreSQLHost?: string;
  postgreSQLPort: number;
  postgreSQLDatabase?: string;
  postgreSQLUsername?: string;
  postgreSQLPassword?: string;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  error?: string;
}

export interface MigrateDatabaseRequest {
  targetProvider: 'PostgreSQL';
  postgreSQLHost?: string;
  postgreSQLPort: number;
  postgreSQLDatabase?: string;
  postgreSQLUsername?: string;
  postgreSQLPassword?: string;
}

export interface MigrateDatabaseResponse {
  success: boolean;
  message: string;
  tablesCreated: number;
  recordsMigrated: number;
  error?: string;
}
