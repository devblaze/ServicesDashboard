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

export interface DatabaseExportMetadata {
  exportedAt: string;
  sourceProvider: string;
  appVersion: string;
  totalRecords: number;
  tableCounts: Record<string, number>;
}

export interface DatabaseExportData {
  managedServers: unknown[];
  sshCredentials: unknown[];
  applicationSettings: unknown[];
  dockerServiceArrangements: unknown[];
  scheduledTasks: unknown[];
  storedDiscoveredServices: unknown[];
  gitProviderConnections: unknown[];
  serverHealthChecks: unknown[];
  updateReports: unknown[];
  serverAlerts: unknown[];
}

export interface DatabaseExportResponse {
  success: boolean;
  message: string;
  error?: string;
  fileName?: string;
  data?: DatabaseExportData;
  metadata?: DatabaseExportMetadata;
}

export interface DatabaseImportRequest {
  data: DatabaseExportData;
  metadata: DatabaseExportMetadata;
  clearExistingData: boolean;
}

export interface DatabaseImportResponse {
  success: boolean;
  message: string;
  error?: string;
  recordsImported: number;
  tableCounts: Record<string, number>;
  warnings: string[];
}

// Remote Sync Types
export interface GenerateSyncTokenResponse {
  success: boolean;
  token: string;
  expiresAt: string;
  message: string;
  totalRecords: number;
  sourceUrls: string[];
}

export interface RemoteSyncRequest {
  sourceUrl: string;
  syncToken: string;
  clearExistingData: boolean;
}

export interface RemoteSyncResponse {
  success: boolean;
  message: string;
  error?: string;
  recordsSynced: number;
  sourceProvider?: string;
  tableCounts: Record<string, number>;
  warnings: string[];
}
