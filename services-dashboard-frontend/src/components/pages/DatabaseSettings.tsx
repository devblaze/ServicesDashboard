import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Database,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Server,
  HardDrive,
  Zap,
  Clock,
  Shield,
  Info,
  Copy,
  Check,
  Download,
  Upload,
  FileJson,
  RefreshCw,
  Link,
  Key,
  Globe
} from 'lucide-react';
import { databaseApi } from '../../services/DatabaseApi';
import type {
  TestConnectionRequest,
  MigrateDatabaseRequest,
  DatabaseProvider,
  DatabaseImportRequest,
  DatabaseExportResponse,
  RemoteSyncRequest,
  GenerateSyncTokenResponse
} from '../../types/database';

interface DatabaseSettingsProps {
  darkMode: boolean;
}

// Provider card configuration
const providerConfig = {
  SQLite: {
    name: 'SQLite',
    icon: HardDrive,
    color: 'blue',
    description: 'Lightweight, file-based database. Perfect for development and small deployments.',
    features: ['Zero configuration', 'File-based storage', 'Great for single-user'],
  },
  PostgreSQL: {
    name: 'PostgreSQL',
    icon: Database,
    color: 'indigo',
    description: 'Powerful, open-source relational database. Recommended for production.',
    features: ['High performance', 'ACID compliant', 'Scalable'],
  },
  SqlServer: {
    name: 'SQL Server',
    icon: Server,
    color: 'red',
    description: 'Microsoft SQL Server 2022. Enterprise-grade database solution.',
    features: ['Enterprise features', 'Windows integration', 'Advanced security'],
  },
};

export function DatabaseSettings({ darkMode }: DatabaseSettingsProps) {
  const queryClient = useQueryClient();

  // Form state
  const [provider, setProvider] = useState<DatabaseProvider>('SQLite');
  const [sqlitePath, setSqlitePath] = useState('servicesdashboard.db');

  // PostgreSQL state
  const [pgHost, setPgHost] = useState('database');
  const [pgPort, setPgPort] = useState(5432);
  const [pgDatabase, setPgDatabase] = useState('servicesdashboard');
  const [pgUsername, setPgUsername] = useState('admin');
  const [pgPassword, setPgPassword] = useState('admin123');

  // SQL Server state
  const [sqlHost, setSqlHost] = useState('sqlserver');
  const [sqlPort, setSqlPort] = useState(1433);
  const [sqlDatabase, setSqlDatabase] = useState('servicesdashboard');
  const [sqlUsername, setSqlUsername] = useState('sa');
  const [sqlPassword, setSqlPassword] = useState('');

  // UI state
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    error?: string;
    serverVersion?: string;
    responseTimeMs?: number;
  } | null>(null);
  const [showMigrationConfirm, setShowMigrationConfirm] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedConnection, setCopiedConnection] = useState(false);

  // Export/Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportResult, setExportResult] = useState<DatabaseExportResponse | null>(null);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    error?: string;
    recordsImported?: number;
    warnings?: string[];
  } | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importData, setImportData] = useState<DatabaseImportRequest | null>(null);
  const [clearExistingData, setClearExistingData] = useState(false);

  // Remote Sync state
  const [syncToken, setSyncToken] = useState<GenerateSyncTokenResponse | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [remoteSourceUrl, setRemoteSourceUrl] = useState('');
  const [remoteSyncToken, setRemoteSyncToken] = useState('');
  const [remoteClearData, setRemoteClearData] = useState(false);
  const [remoteSyncResult, setRemoteSyncResult] = useState<{
    success: boolean;
    message: string;
    error?: string;
    recordsSynced?: number;
    sourceProvider?: string;
    warnings?: string[];
  } | null>(null);

  // Generate environment variables string
  const generateEnvVariables = () => {
    const lines: string[] = [];
    lines.push('# Database Configuration');
    lines.push(`DATABASE_PROVIDER=${provider}`);
    lines.push('');

    if (provider === 'PostgreSQL') {
      lines.push('# PostgreSQL Settings');
      lines.push(`DB_USER=${pgUsername}`);
      lines.push(`DB_PASSWORD=${pgPassword}`);
      lines.push('');
      lines.push('# Connection String (for reference)');
      lines.push(`# Host=database;Database=${pgDatabase};Username=${pgUsername};Password=${pgPassword}`);
    } else if (provider === 'SqlServer') {
      lines.push('# SQL Server Settings');
      lines.push(`DB_USER=${sqlUsername}`);
      lines.push(`DB_PASSWORD=${sqlPassword}`);
      lines.push(`SQLSERVER_HOST=${sqlHost}`);
      lines.push('');
      lines.push('# Connection String (for reference)');
      lines.push(`# Server=${sqlHost};Database=${sqlDatabase};User Id=${sqlUsername};Password=${sqlPassword};TrustServerCertificate=true`);
    } else if (provider === 'SQLite') {
      lines.push('# SQLite Settings');
      lines.push(`# Database file: ${sqlitePath}`);
    }

    return lines.join('\n');
  };

  // Generate connection string
  const generateConnectionString = () => {
    if (provider === 'PostgreSQL') {
      return `Host=${pgHost};Port=${pgPort};Database=${pgDatabase};Username=${pgUsername};Password=${pgPassword}`;
    } else if (provider === 'SqlServer') {
      return `Server=${sqlHost},${sqlPort};Database=${sqlDatabase};User Id=${sqlUsername};Password=${sqlPassword};TrustServerCertificate=true`;
    } else {
      return `Data Source=${sqlitePath}`;
    }
  };

  // Copy to clipboard handlers
  const handleCopyEnv = async () => {
    try {
      await navigator.clipboard.writeText(generateEnvVariables());
      setCopiedEnv(true);
      setTimeout(() => setCopiedEnv(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyConnection = async () => {
    try {
      await navigator.clipboard.writeText(generateConnectionString());
      setCopiedConnection(true);
      setTimeout(() => setCopiedConnection(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Queries
  const { data: status } = useQuery({
    queryKey: ['database-status'],
    queryFn: databaseApi.getDatabaseStatus,
    refetchInterval: 10000
  });

  useQuery({
    queryKey: ['database-configuration'],
    queryFn: databaseApi.getDatabaseConfiguration
  });

  // Mutations
  const testConnectionMutation = useMutation({
    mutationFn: (request: TestConnectionRequest) => databaseApi.testConnection(request),
    onSuccess: (data) => {
      setTestResult(data);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      setTestResult({
        success: false,
        message: 'Connection test failed',
        error: error?.message || 'Unknown error'
      });
    }
  });

  const migrateMutation = useMutation({
    mutationFn: (request: MigrateDatabaseRequest) => databaseApi.migrateDatabase(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['database-status'] });
      queryClient.invalidateQueries({ queryKey: ['database-configuration'] });
      setShowMigrationConfirm(false);
      alert('Database migration completed successfully! Please restart the application to use the new database.');
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      alert(`Migration failed: ${error?.message || 'Unknown error'}`);
    }
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: () => databaseApi.exportDatabase(),
    onSuccess: (data) => {
      setExportResult(data);
      if (data.success && data.data && data.metadata) {
        // Auto-download the export file
        const exportContent = {
          data: data.data,
          metadata: data.metadata
        };
        const blob = new Blob([JSON.stringify(exportContent, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.fileName || `servicesdashboard-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      setExportResult({
        success: false,
        message: 'Export failed',
        error: error?.message || 'Unknown error'
      });
    }
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: (request: DatabaseImportRequest) => databaseApi.importDatabase(request),
    onSuccess: (data) => {
      setImportResult(data);
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['database-status'] });
        setShowImportConfirm(false);
        setImportData(null);
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      setImportResult({
        success: false,
        message: 'Import failed',
        error: error?.message || 'Unknown error'
      });
    }
  });

  // Generate sync token mutation
  const generateTokenMutation = useMutation({
    mutationFn: () => databaseApi.generateSyncToken(),
    onSuccess: (data) => {
      setSyncToken(data);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      setSyncToken({
        success: false,
        token: '',
        expiresAt: '',
        message: error?.message || 'Failed to generate token',
        totalRecords: 0
      });
    }
  });

  // Remote sync mutation
  const remoteSyncMutation = useMutation({
    mutationFn: (request: RemoteSyncRequest) => databaseApi.remoteSync(request),
    onSuccess: (data) => {
      setRemoteSyncResult(data);
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['database-status'] });
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      setRemoteSyncResult({
        success: false,
        message: 'Remote sync failed',
        error: error?.message || 'Unknown error'
      });
    }
  });

  // Handle copy sync token
  const handleCopyToken = async () => {
    if (syncToken?.token) {
      try {
        await navigator.clipboard.writeText(syncToken.token);
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  // Handle remote sync
  const handleRemoteSync = () => {
    if (!remoteSourceUrl || !remoteSyncToken) {
      setRemoteSyncResult({
        success: false,
        message: 'Please enter both source URL and sync token',
        error: 'Missing required fields'
      });
      return;
    }
    remoteSyncMutation.mutate({
      sourceUrl: remoteSourceUrl,
      syncToken: remoteSyncToken,
      clearExistingData: remoteClearData
    });
  };

  // Handle file selection for import
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);
        if (content.data && content.metadata) {
          setImportData({
            data: content.data,
            metadata: content.metadata,
            clearExistingData: clearExistingData
          });
          setShowImportConfirm(true);
        } else {
          setImportResult({
            success: false,
            message: 'Invalid export file format',
            error: 'The file does not contain valid export data'
          });
        }
      } catch {
        setImportResult({
          success: false,
          message: 'Failed to parse file',
          error: 'The file is not valid JSON'
        });
      }
    };
    reader.readAsText(file);

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle import confirmation
  const handleImport = () => {
    if (importData) {
      importMutation.mutate({
        ...importData,
        clearExistingData: clearExistingData
      });
    }
  };

  const handleTestConnection = () => {
    setTestResult(null);

    const request: TestConnectionRequest = {
      provider,
    };

    if (provider === 'SQLite') {
      request.sqlitePath = sqlitePath;
    } else if (provider === 'PostgreSQL') {
      request.postgreSQLHost = pgHost;
      request.postgreSQLPort = pgPort;
      request.postgreSQLDatabase = pgDatabase;
      request.postgreSQLUsername = pgUsername;
      request.postgreSQLPassword = pgPassword;
    } else if (provider === 'SqlServer') {
      request.sqlServerHost = sqlHost;
      request.sqlServerPort = sqlPort;
      request.sqlServerDatabase = sqlDatabase;
      request.sqlServerUsername = sqlUsername;
      request.sqlServerPassword = sqlPassword;
    }

    testConnectionMutation.mutate(request);
  };

  const handleMigrate = () => {
    if (provider === 'PostgreSQL' && !pgPassword) {
      alert('Please enter PostgreSQL password');
      return;
    }
    if (provider === 'SqlServer' && !sqlPassword) {
      alert('Please enter SQL Server password');
      return;
    }

    const request: MigrateDatabaseRequest = {
      targetProvider: provider as 'PostgreSQL' | 'SqlServer',
    };

    if (provider === 'PostgreSQL') {
      request.postgreSQLHost = pgHost;
      request.postgreSQLPort = pgPort;
      request.postgreSQLDatabase = pgDatabase;
      request.postgreSQLUsername = pgUsername;
      request.postgreSQLPassword = pgPassword;
    } else if (provider === 'SqlServer') {
      request.sqlServerHost = sqlHost;
      request.sqlServerPort = sqlPort;
      request.sqlServerDatabase = sqlDatabase;
      request.sqlServerUsername = sqlUsername;
      request.sqlServerPassword = sqlPassword;
    }

    migrateMutation.mutate(request);
  };

  const getProviderColorClasses = (providerKey: string, isSelected: boolean) => {
    const colors: Record<string, { bg: string; border: string; text: string; selectedBg: string }> = {
      blue: {
        bg: darkMode ? 'bg-blue-900/20' : 'bg-blue-50',
        border: isSelected
          ? (darkMode ? 'border-blue-500' : 'border-blue-500')
          : (darkMode ? 'border-gray-700' : 'border-gray-200'),
        text: darkMode ? 'text-blue-400' : 'text-blue-600',
        selectedBg: darkMode ? 'bg-blue-900/40' : 'bg-blue-100',
      },
      indigo: {
        bg: darkMode ? 'bg-indigo-900/20' : 'bg-indigo-50',
        border: isSelected
          ? (darkMode ? 'border-indigo-500' : 'border-indigo-500')
          : (darkMode ? 'border-gray-700' : 'border-gray-200'),
        text: darkMode ? 'text-indigo-400' : 'text-indigo-600',
        selectedBg: darkMode ? 'bg-indigo-900/40' : 'bg-indigo-100',
      },
      red: {
        bg: darkMode ? 'bg-red-900/20' : 'bg-red-50',
        border: isSelected
          ? (darkMode ? 'border-red-500' : 'border-red-500')
          : (darkMode ? 'border-gray-700' : 'border-gray-200'),
        text: darkMode ? 'text-red-400' : 'text-red-600',
        selectedBg: darkMode ? 'bg-red-900/40' : 'bg-red-100',
      },
    };
    const config = providerConfig[providerKey as keyof typeof providerConfig];
    return colors[config.color];
  };

  return (
    <div className="space-y-6">
      {/* Important: How to Change Database Provider */}
      <div className={`p-4 rounded-xl border-2 ${
        darkMode
          ? 'bg-amber-900/20 border-amber-500/50'
          : 'bg-amber-50 border-amber-300'
      }`}>
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg flex-shrink-0 ${
            darkMode ? 'bg-amber-900/50' : 'bg-amber-100'
          }`}>
            <AlertTriangle className={`w-5 h-5 ${
              darkMode ? 'text-amber-400' : 'text-amber-600'
            }`} />
          </div>
          <div>
            <p className={`font-semibold text-base ${darkMode ? 'text-amber-300' : 'text-amber-800'}`}>
              How to Change Database Provider
            </p>
            <p className={`text-sm mt-2 ${darkMode ? 'text-amber-200/80' : 'text-amber-700'}`}>
              To change the active database provider, update the{' '}
              <code className={`font-mono px-1.5 py-0.5 rounded text-xs ${
                darkMode ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-800'
              }`}>DATABASE_PROVIDER</code>{' '}
              environment variable to one of the following values and restart the application:
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                darkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'
              }`}>
                <Database className="w-3 h-3 mr-1.5" />
                PostgreSQL
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'
              }`}>
                <Server className="w-3 h-3 mr-1.5" />
                SqlServer
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                darkMode ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
              }`}>
                <HardDrive className="w-3 h-3 mr-1.5" />
                SQLite
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Current Status Card */}
      {status && (
        <div className={`p-6 rounded-xl border-2 ${
          darkMode
            ? 'bg-gray-800/50 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Database Settings
              </h1>
              <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage database configuration and migrate between providers
              </p>
            </div>
            <div className={`p-3 rounded-xl ${
              status.isConnected
                ? (darkMode ? 'bg-green-900/30' : 'bg-green-100')
                : (darkMode ? 'bg-red-900/30' : 'bg-red-100')
            }`}>
              {status.isConnected ? (
                <CheckCircle className={`w-8 h-8 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
              ) : (
                <XCircle className={`w-8 h-8 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
              )}
            </div>
          </div>

          {/* Status Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Provider Card */}
            <div className={`p-4 rounded-xl border ${
              darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  darkMode ? 'bg-indigo-900/50' : 'bg-indigo-100'
                }`}>
                  <Database className={`w-5 h-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                </div>
                <div>
                  <div className={`text-xs font-medium uppercase tracking-wide ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Provider
                  </div>
                  <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {status.provider}
                  </div>
                </div>
              </div>
            </div>

            {/* Status Card */}
            <div className={`p-4 rounded-xl border ${
              darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  status.isConnected
                    ? (darkMode ? 'bg-green-900/50' : 'bg-green-100')
                    : (darkMode ? 'bg-red-900/50' : 'bg-red-100')
                }`}>
                  {status.isConnected ? (
                    <Zap className={`w-5 h-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                  ) : (
                    <XCircle className={`w-5 h-5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                  )}
                </div>
                <div>
                  <div className={`text-xs font-medium uppercase tracking-wide ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Status
                  </div>
                  <div className={`text-lg font-bold ${
                    status.isConnected
                      ? (darkMode ? 'text-green-400' : 'text-green-600')
                      : (darkMode ? 'text-red-400' : 'text-red-600')
                  }`}>
                    {status.isConnected ? 'Connected' : 'Disconnected'}
                  </div>
                </div>
              </div>
            </div>

            {/* Records Card */}
            <div className={`p-4 rounded-xl border ${
              darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  darkMode ? 'bg-purple-900/50' : 'bg-purple-100'
                }`}>
                  <HardDrive className={`w-5 h-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                </div>
                <div>
                  <div className={`text-xs font-medium uppercase tracking-wide ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Total Records
                  </div>
                  <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {status.totalRecords.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Size Card */}
            {status.databaseSizeMB !== null && status.databaseSizeMB !== undefined && (
              <div className={`p-4 rounded-xl border ${
                darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    darkMode ? 'bg-amber-900/50' : 'bg-amber-100'
                  }`}>
                    <Shield className={`w-5 h-5 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                  </div>
                  <div>
                    <div className={`text-xs font-medium uppercase tracking-wide ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Database Size
                    </div>
                    <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {status.databaseSizeMB} MB
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Connection String */}
          <div className="mt-4">
            <div className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Connection String
            </div>
            <code className={`block mt-2 p-3 rounded-lg text-xs font-mono ${
              darkMode ? 'bg-gray-900 text-gray-300 border border-gray-700' : 'bg-gray-100 text-gray-700 border border-gray-200'
            }`}>
              {status.connectionString}
            </code>
          </div>
        </div>
      )}

      {/* Migration Notice for SQLite Users */}
      {status?.provider === 'SQLite' && (
        <div className={`p-4 rounded-xl border flex items-start space-x-3 ${
          darkMode
            ? 'bg-blue-900/20 border-blue-600/50 text-blue-300'
            : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Consider upgrading to PostgreSQL or SQL Server</p>
            <p className="text-sm mt-1 opacity-90">
              PostgreSQL and SQL Server offer better performance, scalability, and concurrent access for production deployments.
              You can test connections and migrate your data below.
            </p>
          </div>
        </div>
      )}

      {/* Provider Selection Cards */}
      <div className={`p-6 rounded-xl border-2 ${
        darkMode
          ? 'bg-gray-800/50 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-lg font-semibold mb-4 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Test Database Connection
        </h2>

        <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Select a database provider and configure the connection settings to test connectivity.
        </p>

        {/* Provider Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {(Object.keys(providerConfig) as DatabaseProvider[]).map((key) => {
            const config = providerConfig[key];
            const Icon = config.icon;
            const isSelected = provider === key;
            const colors = getProviderColorClasses(key, isSelected);

            return (
              <button
                key={key}
                onClick={() => {
                  setProvider(key);
                  setTestResult(null);
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  isSelected ? colors.selectedBg : colors.bg
                } ${colors.border} ${
                  isSelected ? 'ring-2 ring-offset-2 ' + (darkMode ? 'ring-offset-gray-900' : 'ring-offset-white') + ' ring-' + config.color + '-500' : ''
                } hover:scale-[1.02]`}
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`p-2 rounded-lg ${colors.bg}`}>
                    <Icon className={`w-6 h-6 ${colors.text}`} />
                  </div>
                  <div>
                    <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {config.name}
                    </div>
                    {isSelected && (
                      <div className={`text-xs ${colors.text}`}>Selected</div>
                    )}
                  </div>
                </div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {config.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {config.features.map((feature) => (
                    <span
                      key={feature}
                      className={`text-xs px-2 py-1 rounded-full ${
                        darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Configuration Forms */}
        <div className="space-y-4">
          {/* SQLite Configuration */}
          {provider === 'SQLite' && (
            <div className={`p-4 rounded-lg border ${
              darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Database File Path
              </label>
              <input
                type="text"
                value={sqlitePath}
                onChange={(e) => setSqlitePath(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                placeholder="servicesdashboard.db"
              />
              <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Relative paths are relative to the application directory.
              </p>
            </div>
          )}

          {/* PostgreSQL Configuration */}
          {provider === 'PostgreSQL' && (
            <div className={`p-4 rounded-lg border ${
              darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Host
                  </label>
                  <input
                    type="text"
                    value={pgHost}
                    onChange={(e) => setPgHost(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-800 border-gray-600 text-white focus:border-indigo-500'
                        : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500'
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                    placeholder="database"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Port
                  </label>
                  <input
                    type="number"
                    value={pgPort}
                    onChange={(e) => setPgPort(parseInt(e.target.value))}
                    className={`w-full px-4 py-2.5 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-800 border-gray-600 text-white focus:border-indigo-500'
                        : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500'
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                    placeholder="5432"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Database
                  </label>
                  <input
                    type="text"
                    value={pgDatabase}
                    onChange={(e) => setPgDatabase(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-800 border-gray-600 text-white focus:border-indigo-500'
                        : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500'
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                    placeholder="servicesdashboard"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Username
                  </label>
                  <input
                    type="text"
                    value={pgUsername}
                    onChange={(e) => setPgUsername(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-800 border-gray-600 text-white focus:border-indigo-500'
                        : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500'
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                    placeholder="admin"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={pgPassword}
                    onChange={(e) => setPgPassword(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-800 border-gray-600 text-white focus:border-indigo-500'
                        : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500'
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <p className={`text-xs mt-3 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Docker Compose defaults: Host: <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">database</code>,
                Database: <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">servicesdashboard</code>,
                User: <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">admin</code>
              </p>
            </div>
          )}

          {/* SQL Server Configuration */}
          {provider === 'SqlServer' && (
            <div className={`p-4 rounded-lg border ${
              darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Server Host
                  </label>
                  <input
                    type="text"
                    value={sqlHost}
                    onChange={(e) => setSqlHost(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-800 border-gray-600 text-white focus:border-red-500'
                        : 'bg-white border-gray-300 text-gray-900 focus:border-red-500'
                    } focus:outline-none focus:ring-2 focus:ring-red-500/20`}
                    placeholder="sqlserver or localhost"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Port
                  </label>
                  <input
                    type="number"
                    value={sqlPort}
                    onChange={(e) => setSqlPort(parseInt(e.target.value))}
                    className={`w-full px-4 py-2.5 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-800 border-gray-600 text-white focus:border-red-500'
                        : 'bg-white border-gray-300 text-gray-900 focus:border-red-500'
                    } focus:outline-none focus:ring-2 focus:ring-red-500/20`}
                    placeholder="1433"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Database
                  </label>
                  <input
                    type="text"
                    value={sqlDatabase}
                    onChange={(e) => setSqlDatabase(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-800 border-gray-600 text-white focus:border-red-500'
                        : 'bg-white border-gray-300 text-gray-900 focus:border-red-500'
                    } focus:outline-none focus:ring-2 focus:ring-red-500/20`}
                    placeholder="servicesdashboard"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Username
                  </label>
                  <input
                    type="text"
                    value={sqlUsername}
                    onChange={(e) => setSqlUsername(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-800 border-gray-600 text-white focus:border-red-500'
                        : 'bg-white border-gray-300 text-gray-900 focus:border-red-500'
                    } focus:outline-none focus:ring-2 focus:ring-red-500/20`}
                    placeholder="sa"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={sqlPassword}
                    onChange={(e) => setSqlPassword(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-800 border-gray-600 text-white focus:border-red-500'
                        : 'bg-white border-gray-300 text-gray-900 focus:border-red-500'
                    } focus:outline-none focus:ring-2 focus:ring-red-500/20`}
                    placeholder="••••••••"
                  />
                  <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    SQL Server password must meet complexity requirements (uppercase, lowercase, number, 8+ chars)
                  </p>
                </div>
              </div>
              <p className={`text-xs mt-3 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Docker Compose defaults: Host: <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">sqlserver</code>,
                Port: <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">1433</code>,
                User: <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">sa</code>
              </p>
            </div>
          )}

          {/* Test Button */}
          <button
            onClick={handleTestConnection}
            disabled={testConnectionMutation.isPending}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${
              provider === 'SQLite'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : provider === 'PostgreSQL'
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {testConnectionMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Testing Connection...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Test Connection</span>
              </>
            )}
          </button>

          {/* Test Result Card */}
          {testResult && (
            <div className={`p-4 rounded-xl border-2 ${
              testResult.success
                ? darkMode
                  ? 'bg-green-900/20 border-green-500/50'
                  : 'bg-green-50 border-green-300'
                : darkMode
                  ? 'bg-red-900/20 border-red-500/50'
                  : 'bg-red-50 border-red-300'
            }`}>
              <div className="flex items-start space-x-4">
                <div className={`p-2 rounded-lg ${
                  testResult.success
                    ? (darkMode ? 'bg-green-900/50' : 'bg-green-100')
                    : (darkMode ? 'bg-red-900/50' : 'bg-red-100')
                }`}>
                  {testResult.success ? (
                    <CheckCircle className={`w-6 h-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                  ) : (
                    <XCircle className={`w-6 h-6 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-semibold ${
                    testResult.success
                      ? (darkMode ? 'text-green-400' : 'text-green-700')
                      : (darkMode ? 'text-red-400' : 'text-red-700')
                  }`}>
                    {testResult.message}
                  </p>
                  {testResult.serverVersion && (
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="flex items-center space-x-1">
                        <Server className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {testResult.serverVersion}
                        </span>
                      </div>
                      {testResult.responseTimeMs && (
                        <div className="flex items-center space-x-1">
                          <Clock className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {testResult.responseTimeMs}ms
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {testResult.error && (
                    <p className={`text-sm mt-2 ${
                      darkMode ? 'text-red-300' : 'text-red-600'
                    }`}>
                      {testResult.error}
                    </p>
                  )}
                </div>
              </div>

              {/* Connection Configuration - Show on Success */}
              {testResult.success && (
                <div className="mt-6 space-y-4">
                  {/* Connection String */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Connection String
                      </label>
                      <button
                        onClick={handleCopyConnection}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                          copiedConnection
                            ? (darkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700')
                            : (darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700')
                        }`}
                      >
                        {copiedConnection ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <code className={`block p-3 rounded-lg text-sm font-mono break-all ${
                      darkMode
                        ? 'bg-gray-900 text-green-400 border border-gray-700'
                        : 'bg-white text-green-700 border border-gray-200'
                    }`}>
                      {generateConnectionString()}
                    </code>
                  </div>

                  {/* Environment Variables */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Environment Variables (for Dokploy / .env file)
                      </label>
                      <button
                        onClick={handleCopyEnv}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                          copiedEnv
                            ? (darkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700')
                            : (darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700')
                        }`}
                      >
                        {copiedEnv ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy All</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className={`p-3 rounded-lg text-sm font-mono overflow-x-auto ${
                      darkMode
                        ? 'bg-gray-900 text-gray-300 border border-gray-700'
                        : 'bg-white text-gray-700 border border-gray-200'
                    }`}>
                      {generateEnvVariables()}
                    </pre>
                  </div>

                  {/* Help Text */}
                  <div className={`flex items-start space-x-2 p-3 rounded-lg ${
                    darkMode ? 'bg-blue-900/20' : 'bg-blue-50'
                  }`}>
                    <Info className={`w-4 h-4 flex-shrink-0 mt-0.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      Copy the environment variables above and paste them into your Dokploy environment settings or your <code className="font-mono px-1 rounded bg-blue-100 dark:bg-blue-900/50">.env</code> file.
                      Then restart the application to apply the changes.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Migration Section */}
      {status?.provider === 'SQLite' && (provider === 'PostgreSQL' || provider === 'SqlServer') && testResult?.success && (
        <div className={`p-6 rounded-xl border-2 ${
          darkMode
            ? 'bg-gray-800/50 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-lg font-semibold mb-4 flex items-center space-x-2 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            <ArrowRight className="w-5 h-5" />
            <span>Migrate to {provider}</span>
          </h2>

          <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Ready to migrate your data from SQLite to {provider}. This will copy all your data including:
          </p>

          <ul className={`list-disc list-inside space-y-1 mb-6 text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <li>Managed servers and health checks</li>
            <li>Application settings</li>
            <li>Docker service arrangements</li>
            <li>Scheduled tasks</li>
            <li>All other configuration data</li>
          </ul>

          {!showMigrationConfirm ? (
            <button
              onClick={() => setShowMigrationConfirm(true)}
              className={`px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                provider === 'PostgreSQL'
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              <ArrowRight className="w-4 h-4" />
              <span>Start Migration</span>
            </button>
          ) : (
            <div className={`p-4 rounded-xl border-2 space-y-4 ${
              darkMode
                ? 'bg-yellow-900/20 border-yellow-500/50'
                : 'bg-yellow-50 border-yellow-300'
            }`}>
              <div className="flex items-start space-x-3">
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  darkMode ? 'text-yellow-400' : 'text-yellow-600'
                }`} />
                <div className="flex-1">
                  <p className={`font-medium ${
                    darkMode ? 'text-yellow-300' : 'text-yellow-800'
                  }`}>
                    Confirm Migration
                  </p>
                  <p className={`text-sm mt-1 ${
                    darkMode ? 'text-yellow-400' : 'text-yellow-700'
                  }`}>
                    This will migrate all data to {provider}. After migration, you'll need to update your
                    environment variables and restart the application. Your SQLite database will not be modified.
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleMigrate}
                  disabled={migrateMutation.isPending}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${
                    provider === 'PostgreSQL'
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {migrateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Migrating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Confirm & Migrate</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowMigrationConfirm(false)}
                  disabled={migrateMutation.isPending}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    darkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Export/Import Section */}
      <div className={`p-6 rounded-xl border-2 ${
        darkMode
          ? 'bg-gray-800/50 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-lg font-semibold mb-4 flex items-center space-x-2 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          <RefreshCw className="w-5 h-5" />
          <span>Export / Import Data</span>
        </h2>

        <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Export your database to a JSON file for backup or migration to another deployment. Import data from a previous export.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Section */}
          <div className={`p-4 rounded-xl border ${
            darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center space-x-3 mb-4">
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-green-900/50' : 'bg-green-100'}`}>
                <Download className={`w-5 h-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
              </div>
              <div>
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Export Database
                </h3>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Download all data as JSON
                </p>
              </div>
            </div>

            <button
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              className={`w-full px-4 py-2.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${
                darkMode
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {exportMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export Database</span>
                </>
              )}
            </button>

            {exportResult && (
              <div className={`mt-4 p-3 rounded-lg ${
                exportResult.success
                  ? (darkMode ? 'bg-green-900/30' : 'bg-green-50')
                  : (darkMode ? 'bg-red-900/30' : 'bg-red-50')
              }`}>
                <div className="flex items-start space-x-2">
                  {exportResult.success ? (
                    <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                  ) : (
                    <XCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${
                      exportResult.success
                        ? (darkMode ? 'text-green-300' : 'text-green-700')
                        : (darkMode ? 'text-red-300' : 'text-red-700')
                    }`}>
                      {exportResult.message}
                    </p>
                    {exportResult.metadata && (
                      <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {exportResult.metadata.totalRecords} records from {Object.keys(exportResult.metadata.tableCounts).length} tables
                      </p>
                    )}
                    {exportResult.error && (
                      <p className={`text-xs mt-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                        {exportResult.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Import Section */}
          <div className={`p-4 rounded-xl border ${
            darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center space-x-3 mb-4">
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-900/50' : 'bg-blue-100'}`}>
                <Upload className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <div>
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Import Database
                </h3>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Restore from JSON export
                </p>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".json"
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importMutation.isPending}
              className={`w-full px-4 py-2.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${
                darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <FileJson className="w-4 h-4" />
              <span>Select Export File</span>
            </button>

            {/* Clear existing data toggle */}
            <div className={`flex items-center justify-between p-3 mt-3 rounded-lg ${
              darkMode ? 'bg-gray-800/50' : 'bg-gray-100'
            }`}>
              <div className="flex items-center space-x-2">
                <AlertTriangle className={`w-4 h-4 ${clearExistingData ? (darkMode ? 'text-red-400' : 'text-red-500') : (darkMode ? 'text-gray-500' : 'text-gray-400')}`} />
                <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Clear existing data before import
                </span>
              </div>
              <button
                type="button"
                onClick={() => setClearExistingData(!clearExistingData)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  clearExistingData
                    ? 'bg-red-500 focus:ring-red-500'
                    : (darkMode ? 'bg-gray-600 focus:ring-gray-500' : 'bg-gray-300 focus:ring-gray-400')
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                    clearExistingData ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {importResult && !showImportConfirm && (
              <div className={`mt-4 p-3 rounded-lg ${
                importResult.success
                  ? (darkMode ? 'bg-green-900/30' : 'bg-green-50')
                  : (darkMode ? 'bg-red-900/30' : 'bg-red-50')
              }`}>
                <div className="flex items-start space-x-2">
                  {importResult.success ? (
                    <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                  ) : (
                    <XCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${
                      importResult.success
                        ? (darkMode ? 'text-green-300' : 'text-green-700')
                        : (darkMode ? 'text-red-300' : 'text-red-700')
                    }`}>
                      {importResult.message}
                    </p>
                    {importResult.recordsImported !== undefined && (
                      <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {importResult.recordsImported} records imported
                      </p>
                    )}
                    {importResult.warnings && importResult.warnings.length > 0 && (
                      <ul className={`text-xs mt-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                        {importResult.warnings.map((warning, idx) => (
                          <li key={idx}>• {warning}</li>
                        ))}
                      </ul>
                    )}
                    {importResult.error && (
                      <p className={`text-xs mt-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                        {importResult.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Import Confirmation Modal */}
        {showImportConfirm && importData && (
          <div className={`mt-6 p-4 rounded-xl border-2 ${
            darkMode
              ? 'bg-yellow-900/20 border-yellow-500/50'
              : 'bg-yellow-50 border-yellow-300'
          }`}>
            <div className="flex items-start space-x-3">
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                darkMode ? 'text-yellow-400' : 'text-yellow-600'
              }`} />
              <div className="flex-1">
                <p className={`font-medium ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                  Confirm Import
                </p>
                <div className={`text-sm mt-2 ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
                  <p>You are about to import data from:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Source Provider: <strong>{importData.metadata.sourceProvider}</strong></li>
                    <li>Export Date: <strong>{new Date(importData.metadata.exportedAt).toLocaleString()}</strong></li>
                    <li>Total Records: <strong>{importData.metadata.totalRecords}</strong></li>
                  </ul>
                  {clearExistingData && (
                    <p className={`mt-2 font-medium ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                      Warning: This will clear all existing data before importing!
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-4">
              <button
                onClick={handleImport}
                disabled={importMutation.isPending}
                className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white`}
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirm & Import</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setShowImportConfirm(false);
                  setImportData(null);
                }}
                disabled={importMutation.isPending}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Help text */}
        <div className={`mt-6 flex items-start space-x-2 p-3 rounded-lg ${
          darkMode ? 'bg-blue-900/20' : 'bg-blue-50'
        }`}>
          <Info className={`w-4 h-4 flex-shrink-0 mt-0.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          <div className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
            <p className="font-medium">Workflow for migrating between deployments:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Export your database from your local/source deployment</li>
              <li>Transfer the JSON file to your target deployment</li>
              <li>Import the JSON file into the target database</li>
              <li>Note: SSH credentials are imported but may need to be re-linked to servers</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Remote Sync Section */}
      <div className={`p-6 rounded-xl border-2 ${
        darkMode
          ? 'bg-gray-800/50 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-lg font-semibold mb-4 flex items-center space-x-2 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          <Link className="w-5 h-5" />
          <span>Remote Database Sync</span>
        </h2>

        <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Sync your database directly from another running instance without manually transferring files.
          Generate a one-time sync token on the source, then use it to pull data to this instance.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Generate Token Section (Source) */}
          <div className={`p-4 rounded-xl border ${
            darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center space-x-3 mb-4">
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-purple-900/50' : 'bg-purple-100'}`}>
                <Key className={`w-5 h-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
              </div>
              <div>
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Generate Sync Token
                </h3>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Use this on the SOURCE database
                </p>
              </div>
            </div>

            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Generate a one-time token that allows another instance to pull your data. Token is valid for 15 minutes.
            </p>

            <button
              onClick={() => generateTokenMutation.mutate()}
              disabled={generateTokenMutation.isPending}
              className={`w-full px-4 py-2.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${
                darkMode
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {generateTokenMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>Generate Sync Token</span>
                </>
              )}
            </button>

            {syncToken && (
              <div className={`mt-4 p-3 rounded-lg ${
                syncToken.success
                  ? (darkMode ? 'bg-purple-900/30' : 'bg-purple-50')
                  : (darkMode ? 'bg-red-900/30' : 'bg-red-50')
              }`}>
                {syncToken.success ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                        Sync Token Generated
                      </span>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {syncToken.totalRecords} records available
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <code className={`flex-1 p-2 rounded text-xs font-mono truncate ${
                        darkMode
                          ? 'bg-gray-900 text-purple-400 border border-gray-700'
                          : 'bg-white text-purple-700 border border-gray-200'
                      }`}>
                        {syncToken.token}
                      </code>
                      <button
                        onClick={handleCopyToken}
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          copiedToken
                            ? (darkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700')
                            : (darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700')
                        }`}
                      >
                        {copiedToken ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Expires: {new Date(syncToken.expiresAt).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start space-x-2">
                    <XCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                    <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                      {syncToken.message}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pull from Remote Section (Target) */}
          <div className={`p-4 rounded-xl border ${
            darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center space-x-3 mb-4">
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-cyan-900/50' : 'bg-cyan-100'}`}>
                <Globe className={`w-5 h-5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
              </div>
              <div>
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Sync from Remote
                </h3>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Use this on the TARGET database
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Source URL
                </label>
                <input
                  type="text"
                  value={remoteSourceUrl}
                  onChange={(e) => setRemoteSourceUrl(e.target.value)}
                  placeholder="https://your-source-server.com"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    darkMode
                      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:border-cyan-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-cyan-500'
                  } focus:outline-none focus:ring-2 focus:ring-cyan-500/20`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1.5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Sync Token
                </label>
                <input
                  type="text"
                  value={remoteSyncToken}
                  onChange={(e) => setRemoteSyncToken(e.target.value)}
                  placeholder="Paste sync token from source"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    darkMode
                      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:border-cyan-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-cyan-500'
                  } focus:outline-none focus:ring-2 focus:ring-cyan-500/20`}
                />
              </div>

              <div className={`flex items-center justify-between p-3 rounded-lg ${
                darkMode ? 'bg-gray-800/50' : 'bg-gray-100'
              }`}>
                <div className="flex items-center space-x-2">
                  <AlertTriangle className={`w-4 h-4 ${remoteClearData ? (darkMode ? 'text-red-400' : 'text-red-500') : (darkMode ? 'text-gray-500' : 'text-gray-400')}`} />
                  <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Clear existing data before sync
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setRemoteClearData(!remoteClearData)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    remoteClearData
                      ? 'bg-red-500 focus:ring-red-500'
                      : (darkMode ? 'bg-gray-600 focus:ring-gray-500' : 'bg-gray-300 focus:ring-gray-400')
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                      remoteClearData ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <button
                onClick={handleRemoteSync}
                disabled={remoteSyncMutation.isPending || !remoteSourceUrl || !remoteSyncToken}
                className={`w-full px-4 py-2.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${
                  darkMode
                    ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                    : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                }`}
              >
                {remoteSyncMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Start Remote Sync</span>
                  </>
                )}
              </button>
            </div>

            {remoteSyncResult && (
              <div className={`mt-4 p-3 rounded-lg ${
                remoteSyncResult.success
                  ? (darkMode ? 'bg-green-900/30' : 'bg-green-50')
                  : (darkMode ? 'bg-red-900/30' : 'bg-red-50')
              }`}>
                <div className="flex items-start space-x-2">
                  {remoteSyncResult.success ? (
                    <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                  ) : (
                    <XCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${
                      remoteSyncResult.success
                        ? (darkMode ? 'text-green-300' : 'text-green-700')
                        : (darkMode ? 'text-red-300' : 'text-red-700')
                    }`}>
                      {remoteSyncResult.message}
                    </p>
                    {remoteSyncResult.recordsSynced !== undefined && remoteSyncResult.recordsSynced > 0 && (
                      <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {remoteSyncResult.recordsSynced} records synced from {remoteSyncResult.sourceProvider}
                      </p>
                    )}
                    {remoteSyncResult.warnings && remoteSyncResult.warnings.length > 0 && (
                      <ul className={`text-xs mt-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                        {remoteSyncResult.warnings.map((warning, idx) => (
                          <li key={idx}>• {warning}</li>
                        ))}
                      </ul>
                    )}
                    {remoteSyncResult.error && (
                      <p className={`text-xs mt-1 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                        {remoteSyncResult.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Remote Sync Help */}
        <div className={`mt-6 flex items-start space-x-2 p-3 rounded-lg ${
          darkMode ? 'bg-purple-900/20' : 'bg-purple-50'
        }`}>
          <Info className={`w-4 h-4 flex-shrink-0 mt-0.5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
          <div className={`text-sm ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
            <p className="font-medium">How Remote Sync Works:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>On your <strong>source</strong> server (e.g., local PostgreSQL), click "Generate Sync Token"</li>
              <li>Copy the generated token</li>
              <li>On your <strong>target</strong> server (e.g., deployed SQL Server), enter the source URL and token</li>
              <li>Click "Start Remote Sync" to pull all data from source to target</li>
            </ol>
            <p className="mt-2 text-xs opacity-80">
              Note: The sync token is one-time use and expires after 15 minutes. Both servers must be accessible over the network.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
