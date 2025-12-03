import { useState } from 'react';
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
  Check
} from 'lucide-react';
import { databaseApi } from '../../services/DatabaseApi';
import type { TestConnectionRequest, MigrateDatabaseRequest, DatabaseProvider } from '../../types/database';

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

      {/* Environment Variable Note */}
      <div className={`p-4 rounded-xl border ${
        darkMode
          ? 'bg-gray-800/30 border-gray-700'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-start space-x-3">
          <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <div>
            <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Changing Database Provider
            </p>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              To change the active database provider, update the <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">DATABASE_PROVIDER</code> environment
              variable to <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">PostgreSQL</code>, <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">SqlServer</code>,
              or <code className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">SQLite</code> and restart the application.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
