import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Database, CheckCircle, XCircle, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { databaseApi } from '../../services/DatabaseApi';
import type { TestConnectionRequest, MigrateDatabaseRequest } from '../../types/database';

interface DatabaseSettingsProps {
  darkMode: boolean;
}

export function DatabaseSettings({ darkMode }: DatabaseSettingsProps) {
  const queryClient = useQueryClient();

  // Form state
  const [provider, setProvider] = useState<'SQLite' | 'PostgreSQL'>('SQLite');
  const [sqlitePath, setSqlitePath] = useState('servicesdashboard.db');
  const [pgHost, setPgHost] = useState('database');
  const [pgPort, setPgPort] = useState(5432);
  const [pgDatabase, setPgDatabase] = useState('servicesdashboard');
  const [pgUsername, setPgUsername] = useState('admin');
  const [pgPassword, setPgPassword] = useState('admin123');

  // UI state
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; error?: string } | null>(null);
  const [showMigrationConfirm, setShowMigrationConfirm] = useState(false);

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
      alert('Database migration completed successfully! Please restart the application to use PostgreSQL.');
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
      postgreSQLPort: pgPort
    };

    if (provider === 'SQLite') {
      request.sqlitePath = sqlitePath;
    } else {
      request.postgreSQLHost = pgHost;
      request.postgreSQLDatabase = pgDatabase;
      request.postgreSQLUsername = pgUsername;
      request.postgreSQLPassword = pgPassword;
    }

    testConnectionMutation.mutate(request);
  };

  const handleMigrate = () => {
    if (!pgPassword) {
      alert('Please enter PostgreSQL password');
      return;
    }

    const request: MigrateDatabaseRequest = {
      targetProvider: 'PostgreSQL',
      postgreSQLHost: pgHost,
      postgreSQLPort: pgPort,
      postgreSQLDatabase: pgDatabase,
      postgreSQLUsername: pgUsername,
      postgreSQLPassword: pgPassword
    };

    migrateMutation.mutate(request);
  };

  return (
    <div className="space-y-6">
      {/* Header */}

      {/* Current Status */}
      {status && (
        <div className={`p-6 rounded-xl border-2 ${
          darkMode
            ? 'bg-gray-800/50 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <div>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Database Settings
            </h1>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage database configuration and migrate between SQLite and PostgreSQL
            </p>
          </div>
          <br/>
          <h2 className={`text-lg font-semibold mb-4 flex items-center space-x-2 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            <Database className="w-5 h-5" />
            <span>Current Database</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-4 rounded-lg ${
              darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
            }`}>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Provider
              </div>
              <div className={`text-lg font-semibold mt-1 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {status.provider}
              </div>
            </div>

            <div className={`p-4 rounded-lg ${
              darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
            }`}>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Status
              </div>
              <div className="flex items-center space-x-2 mt-1">
                {status.isConnected ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                      Connected
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className={`font-semibold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                      Disconnected
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className={`p-4 rounded-lg ${
              darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
            }`}>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Records
              </div>
              <div className={`text-lg font-semibold mt-1 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {status.totalRecords.toLocaleString()}
              </div>
            </div>

            {status.databaseSizeMB !== null && status.databaseSizeMB !== undefined && (
              <div className={`p-4 rounded-lg ${
                darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
              }`}>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Database Size
                </div>
                <div className={`text-lg font-semibold mt-1 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {status.databaseSizeMB} MB
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Connection String
            </div>
            <code className={`block mt-1 p-2 rounded text-xs ${
              darkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'
            }`}>
              {status.connectionString}
            </code>
          </div>
        </div>
      )}

      {/* Migration Notice for SQLite Users */}
      {status?.provider === 'SQLite' && (
        <div className={`p-4 rounded-lg border flex items-start space-x-3 ${
          darkMode
            ? 'bg-blue-900/20 border-blue-600/50 text-blue-300'
            : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Consider upgrading to PostgreSQL</p>
            <p className="text-sm mt-1 opacity-90">
              PostgreSQL offers better performance, scalability, and concurrent access for production deployments.
              You can migrate your data below.
            </p>
          </div>
        </div>
      )}

      {/* Test Connection Form */}
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

        <div className="space-y-4">
          {/* Provider Selection */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Database Provider
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="SQLite"
                  checked={provider === 'SQLite'}
                  onChange={() => setProvider('SQLite')}
                  className="text-blue-600"
                />
                <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>SQLite</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="PostgreSQL"
                  checked={provider === 'PostgreSQL'}
                  onChange={() => setProvider('PostgreSQL')}
                  className="text-blue-600"
                />
                <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>PostgreSQL</span>
              </label>
            </div>
          </div>

          {/* SQLite Configuration */}
          {provider === 'SQLite' && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Database File Path
              </label>
              <input
                type="text"
                value={sqlitePath}
                onChange={(e) => setSqlitePath(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="servicesdashboard.db"
              />
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Relative paths are relative to the application directory. Use <code className="font-mono">servicesdashboard.db</code> for Docker or <code className="font-mono">/tmp/servicesdashboard.db</code> for guaranteed write access.
              </p>
            </div>
          )}

          {/* PostgreSQL Configuration */}
          {provider === 'PostgreSQL' && (
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
                  className={`w-full px-3 py-2 rounded-lg border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="database"
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Use <code className="font-mono">database</code> when running in Docker Compose
                </p>
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
                  className={`w-full px-3 py-2 rounded-lg border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
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
                  className={`w-full px-3 py-2 rounded-lg border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
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
                  className={`w-full px-3 py-2 rounded-lg border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
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
                  className={`w-full px-3 py-2 rounded-lg border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="••••••••"
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Docker Compose defaults - Host: <code className="font-mono">database</code>, Database: <code className="font-mono">servicesdashboard</code>, User: <code className="font-mono">admin</code>, Password: <code className="font-mono">admin123</code>
                </p>
              </div>
            </div>
          )}

          {/* Test Button */}
          <button
            onClick={handleTestConnection}
            disabled={testConnectionMutation.isPending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {testConnectionMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Testing...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Test Connection</span>
              </>
            )}
          </button>

          {/* Test Result */}
          {testResult && (
            <div className={`p-4 rounded-lg border ${
              testResult.success
                ? darkMode
                  ? 'bg-green-900/20 border-green-600/50 text-green-300'
                  : 'bg-green-50 border-green-200 text-green-700'
                : darkMode
                  ? 'bg-red-900/20 border-red-600/50 text-red-300'
                  : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="flex items-start space-x-3">
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{testResult.message}</p>
                  {testResult.error && (
                    <p className="text-sm mt-1 opacity-90">{testResult.error}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Migration Section */}
      {status?.provider === 'SQLite' && provider === 'PostgreSQL' && testResult?.success && (
        <div className={`p-6 rounded-xl border-2 ${
          darkMode
            ? 'bg-gray-800/50 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-lg font-semibold mb-4 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Migrate to PostgreSQL
          </h2>

          <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Ready to migrate your data from SQLite to PostgreSQL. This will copy all your data including:
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
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <ArrowRight className="w-4 h-4" />
              <span>Start Migration</span>
            </button>
          ) : (
            <div className={`p-4 rounded-lg border space-y-4 ${
              darkMode
                ? 'bg-yellow-900/20 border-yellow-600/50'
                : 'bg-yellow-50 border-yellow-200'
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
                    This will migrate all data to PostgreSQL. After migration, you'll need to restart the application
                    with PostgreSQL configuration. Your SQLite database will not be modified.
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleMigrate}
                  disabled={migrateMutation.isPending}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
    </div>
  );
}
