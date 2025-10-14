import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, X, Download, ExternalLink } from 'lucide-react';
import { updateApi } from '../services/updateApi';

export function UpdateNotification() {
  const [dismissed, setDismissed] = useState(false);

  // Check for updates every hour
  const { data: updateInfo } = useQuery({
    queryKey: ['update-check'],
    queryFn: updateApi.checkForUpdates,
    refetchInterval: 60 * 60 * 1000, // 1 hour
    retry: false,
  });

  // Check localStorage for dismissed updates
  useEffect(() => {
    if (updateInfo?.latestVersion) {
      const dismissedVersion = localStorage.getItem('dismissedUpdateVersion');
      if (dismissedVersion === updateInfo.latestVersion) {
        setDismissed(true);
      } else {
        setDismissed(false);
      }
    }
  }, [updateInfo?.latestVersion]);

  const handleDismiss = () => {
    if (updateInfo?.latestVersion) {
      localStorage.setItem('dismissedUpdateVersion', updateInfo.latestVersion);
      setDismissed(true);
    }
  };

  if (!updateInfo?.updateAvailable || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-5">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Update Available
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Version {updateInfo.latestVersion} is now available. You're currently running {updateInfo.currentVersion}.
            </p>

            {updateInfo.releaseNotes && (
              <details className="mt-2">
                <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                  View release notes
                </summary>
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 max-h-32 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{updateInfo.releaseNotes}</pre>
                </div>
              </details>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  // Open instructions modal or page
                  window.open('/settings#updates', '_self');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                <Download className="h-4 w-4" />
                Update Now
              </button>

              {updateInfo.downloadUrl && (
                <a
                  href={updateInfo.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-700 rounded-md transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Download
                </a>
              )}

              <button
                onClick={handleDismiss}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-md transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
