import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, AlertTriangle, Server } from 'lucide-react';
import { serverManagementApi } from '../services/serverManagementApi';
import type { ServerAlert } from '../types/ServerManagement';

interface ServerAlertsNotificationsProps {
  onNavigateToServers?: () => void;
  darkMode?: boolean;
}

export const ServerAlertsNotifications: React.FC<ServerAlertsNotificationsProps> = ({
  onNavigateToServers,
  darkMode = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<number>>(new Set());

  // Fetch alerts
  const { data: alerts = [] } = useQuery<ServerAlert[], Error>({
    queryKey: ['server-alerts'],
    queryFn: () => serverManagementApi.getAlerts(),
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
    retry: 1,
  });

  // Fetch servers to get server names
  const { data: servers = [] } = useQuery({
    queryKey: ['managed-servers'],
    queryFn: () => serverManagementApi.getServers(),
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  // Filter out dismissed alerts
  const activeAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id));

  const dismissAlert = (alertId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  const clearAllAlerts = () => {
    setDismissedAlerts(new Set(alerts.map(a => a.id)));
    setIsExpanded(false);
  };

  const handleAlertClick = () => {
    if (onNavigateToServers) {
      onNavigateToServers();
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'text-red-400';
      case 'High': return 'text-orange-400';
      case 'Medium': return 'text-yellow-400';
      case 'Low': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getSeverityBgColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-900/50 border-red-600';
      case 'High': return 'bg-orange-900/50 border-orange-600';
      case 'Medium': return 'bg-yellow-900/50 border-yellow-600';
      case 'Low': return 'bg-blue-900/50 border-blue-600';
      default: return 'bg-gray-700 border-gray-600';
    }
  };

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'Critical':
      case 'High':
        return <AlertTriangle className={`h-5 w-5 ${getSeverityColor(severity)}`} />;
      default:
        return <AlertTriangle className={`h-5 w-5 ${getSeverityColor(severity)}`} />;
    }
  };

  // Don't render if no active alerts
  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Collapsed view */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={`rounded-lg px-4 py-2 shadow-lg flex items-center space-x-2 transition-colors ${
            darkMode
              ? 'bg-red-900/90 hover:bg-red-800 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          <AlertTriangle className="h-5 w-5 animate-pulse" />
          <span>{activeAlerts.length} active alert{activeAlerts.length !== 1 ? 's' : ''}</span>
        </button>
      )}

      {/* Expanded view */}
      {isExpanded && (
        <div className={`rounded-lg shadow-xl w-96 max-h-96 overflow-hidden flex flex-col ${
          darkMode ? 'bg-gray-800' : 'bg-white border border-gray-200'
        }`}>
          {/* Header */}
          <div className={`px-4 py-3 border-b flex items-center justify-between ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <h3 className={`font-semibold flex items-center space-x-2 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <span>Server Alerts</span>
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={clearAllAlerts}
                className={`transition-colors text-sm ${
                  darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Clear
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className={`transition-colors ${
                  darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Alerts list */}
          <div className="flex-1 overflow-y-auto">
            {activeAlerts.map(alert => {
              const server = servers.find(s => s.id === alert.serverId);

              return (
                <div
                  key={alert.id}
                  className={`px-4 py-3 border-b transition-colors cursor-pointer ${
                    darkMode
                      ? 'border-gray-700 hover:bg-gray-750'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={handleAlertClick}
                >
                  <div className="flex items-start space-x-3">
                    {getIcon(alert.severity)}
                    <div className="flex-1 min-w-0">
                      {/* Severity and Type badges */}
                      <div className="flex items-center space-x-2 mb-1.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getSeverityBgColor(alert.severity)} ${getSeverityColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {alert.type}
                        </span>
                      </div>

                      {/* Server info */}
                      {server && (
                        <div className="flex items-center space-x-1.5 mb-1">
                          <Server className={`h-3 w-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          <span className={`text-xs font-medium ${
                            darkMode ? 'text-blue-400' : 'text-blue-600'
                          }`}>
                            {server.name}
                          </span>
                          <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            ({server.hostAddress})
                          </span>
                        </div>
                      )}

                      {/* Alert message */}
                      <div className={`text-sm mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {alert.message}
                      </div>

                      {/* Alert details */}
                      {alert.details && (
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {alert.details}
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className={`text-xs mt-1.5 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {new Date(alert.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {/* Dismiss button */}
                    <button
                      onClick={(e) => dismissAlert(alert.id, e)}
                      className={`flex-shrink-0 transition-colors ${
                        darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'
                      }`}
                      title="Dismiss alert"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
