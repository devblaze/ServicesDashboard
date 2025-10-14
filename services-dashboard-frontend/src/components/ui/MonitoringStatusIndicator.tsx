import React from 'react';
import { useServerMonitoringSettings } from '../../hooks/SettingsHooks';

interface MonitoringStatusIndicatorProps {
  darkMode?: boolean;
}

export const MonitoringStatusIndicator: React.FC<MonitoringStatusIndicatorProps> = ({ darkMode = true }) => {
  const { data: settings } = useServerMonitoringSettings();

  if (!settings || !settings.enableAutoMonitoring) {
    return (
      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
        darkMode
          ? 'bg-gray-700/30 text-gray-400 border border-gray-600/30'
          : 'bg-gray-100 text-gray-600 border border-gray-200'
      }`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full" />
        <span>Auto-monitoring disabled</span>
      </div>
    );
  }

  const getIntervalLabel = (minutes: number) => {
    if (minutes === 1) return '1 min';
    if (minutes === 60) return '1 hour';
    return `${minutes} mins`;
  };

  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
      darkMode
        ? 'bg-green-900/30 text-green-400 border border-green-600/30'
        : 'bg-green-100 text-green-700 border border-green-200'
    }`}>
      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
      <span>
        Auto-monitoring enabled
        {settings.monitoringIntervalMinutes && (
          <span className="ml-1 opacity-75">
            ({getIntervalLabel(settings.monitoringIntervalMinutes)})
          </span>
        )}
      </span>
    </div>
  );
};
