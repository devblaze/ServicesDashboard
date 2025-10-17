import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, RefreshCw, CheckCircle, AlertCircle, ExternalLink, Terminal, Copy } from 'lucide-react';
import { updateApi } from '../../services/updateApi';

interface UpdateSettingsSectionProps {
  darkMode?: boolean;
}

export const UpdateSettingsSection: React.FC<UpdateSettingsSectionProps> = ({ darkMode = true }) => {
  const [checking, setChecking] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);

  const { data: updateInfo, refetch: checkForUpdates, isLoading } = useQuery({
    queryKey: ['update-check-manual'],
    queryFn: updateApi.checkForUpdates,
    enabled: false, // Don't auto-run
  });

  const { data: versionInfo, isLoading: versionLoading } = useQuery({
    queryKey: ['current-version'],
    queryFn: updateApi.getCurrentVersion,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  const handleCheckForUpdates = async () => {
    setChecking(true);
    try {
      await checkForUpdates();
    } finally {
      setChecking(false);
    }
  };

  const handleCopyCommand = () => {
    const command = `sudo bash /opt/servicesdashboard/update.sh`;
    navigator.clipboard.writeText(command);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  return (
    <div className={`rounded-xl border p-6 ${
      darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <h2 className={`text-xl font-semibold mb-6 ${
        darkMode ? 'text-white' : 'text-gray-900'
      }`}>
        Application Updates
      </h2>

      {/* Current Version */}
      <div className={`p-4 rounded-lg mb-6 ${
        darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Current Version
            </p>
            <p className={`text-2xl font-bold mt-1 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {versionLoading ? (
                <span className="text-sm opacity-50">Loading...</span>
              ) : (
                versionInfo?.version || 'Unknown'
              )}
            </p>
            {versionInfo?.platform && (
              <p className={`text-xs mt-1 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Platform: {versionInfo.platform}
              </p>
            )}
          </div>
          <button
            onClick={handleCheckForUpdates}
            disabled={checking || isLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              darkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-700 disabled:text-gray-500'
                : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${(checking || isLoading) ? 'animate-spin' : ''}`} />
            Check for Updates
          </button>
        </div>
      </div>

      {/* Update Status */}
      {updateInfo && (
        <div className={`p-4 rounded-lg mb-6 border ${
          updateInfo.updateAvailable
            ? darkMode
              ? 'bg-blue-900/20 border-blue-800'
              : 'bg-blue-50 border-blue-200'
            : darkMode
              ? 'bg-green-900/20 border-green-800'
              : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-start gap-3">
            {updateInfo.updateAvailable ? (
              <Download className={`w-5 h-5 flex-shrink-0 ${
                darkMode ? 'text-blue-400' : 'text-blue-600'
              }`} />
            ) : (
              <CheckCircle className={`w-5 h-5 flex-shrink-0 ${
                darkMode ? 'text-green-400' : 'text-green-600'
              }`} />
            )}
            <div className="flex-1">
              <p className={`font-medium ${
                updateInfo.updateAvailable
                  ? darkMode ? 'text-blue-400' : 'text-blue-700'
                  : darkMode ? 'text-green-400' : 'text-green-700'
              }`}>
                {updateInfo.updateAvailable ? 'Update Available!' : 'You\'re up to date'}
              </p>
              <p className={`text-sm mt-1 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {updateInfo.updateAvailable
                  ? `Version ${updateInfo.latestVersion} is now available`
                  : `You have the latest version (${updateInfo.currentVersion})`
                }
              </p>

              {updateInfo.updateAvailable && updateInfo.releaseNotes && (
                <details className="mt-3">
                  <summary className={`text-sm cursor-pointer hover:underline ${
                    darkMode ? 'text-blue-400' : 'text-blue-600'
                  }`}>
                    View release notes
                  </summary>
                  <div className={`mt-2 text-sm p-3 rounded border max-h-48 overflow-y-auto ${
                    darkMode ? 'bg-gray-800/50 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-700'
                  }`}>
                    <pre className="whitespace-pre-wrap font-mono text-xs">{updateInfo.releaseNotes}</pre>
                  </div>
                </details>
              )}

              {updateInfo.updateAvailable && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {updateInfo.downloadUrl && (
                    <a
                      href={updateInfo.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        darkMode
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      <Download className="w-4 h-4" />
                      Download Update
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Update Instructions */}
      <div className={`p-4 rounded-lg border ${
        darkMode ? 'bg-gray-700/30 border-gray-700' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-start gap-3">
          <Terminal className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`} />
          <div className="flex-1">
            <h3 className={`font-medium mb-2 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Update Instructions
            </h3>
            <p className={`text-sm mb-3 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              To update your installation, run the following command on your server:
            </p>
            <div className="relative">
              <pre className={`p-3 rounded border text-sm overflow-x-auto ${
                darkMode ? 'bg-gray-900/50 border-gray-600 text-gray-300' : 'bg-white border-gray-300 text-gray-800'
              }`}>
                <code>sudo bash /opt/servicesdashboard/update.sh</code>
              </pre>
              <button
                onClick={handleCopyCommand}
                className={`absolute top-2 right-2 p-1.5 rounded transition-colors ${
                  darkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
                title="Copy command"
              >
                {copiedCommand ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className={`mt-3 text-xs space-y-1 ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <p>• The update script will automatically:</p>
              <p className="ml-4">- Download the latest version</p>
              <p className="ml-4">- Stop the service</p>
              <p className="ml-4">- Backup current installation</p>
              <p className="ml-4">- Install the new version</p>
              <p className="ml-4">- Restart the service</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${
        darkMode ? 'bg-yellow-900/20 border border-yellow-800/50' : 'bg-yellow-50 border border-yellow-200'
      }`}>
        <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
          darkMode ? 'text-yellow-400' : 'text-yellow-600'
        }`} />
        <div className="text-xs space-y-1">
          <p className={darkMode ? 'text-yellow-300' : 'text-yellow-800'}>
            <strong>Note:</strong> The update process may take a few minutes. The service will be briefly unavailable during the update.
          </p>
          <p className={darkMode ? 'text-yellow-400' : 'text-yellow-700'}>
            A backup will be created before updating. If anything goes wrong, you can restore from the backup.
          </p>
        </div>
      </div>

      {/* Links */}
      <div className="mt-4 flex flex-wrap gap-4">
        <a
          href="https://github.com/devblaze/ServicesDashboard/releases"
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 text-sm transition-colors ${
            darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
          }`}
        >
          <ExternalLink className="w-4 h-4" />
          View all releases
        </a>
        <a
          href="https://github.com/devblaze/ServicesDashboard/blob/main/CHANGELOG.md"
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 text-sm transition-colors ${
            darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
          }`}
        >
          <ExternalLink className="w-4 h-4" />
          Changelog
        </a>
      </div>
    </div>
  );
};
