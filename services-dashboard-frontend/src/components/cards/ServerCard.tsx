import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Cpu,
  HardDrive,
  Loader2,
  MemoryStick,
  Shield,
  CheckSquare,
  Square
} from 'lucide-react';
import type { ManagedServer } from '../../types/ServerManagement';
import { serverManagementApi } from '../../services/serverManagementApi';

interface ServerCardProps {
  server: ManagedServer;
  darkMode: boolean;
  onSelect: (server: ManagedServer) => void;
  getStatusIcon: (status: string) => React.ReactElement;
  getServerTypeIcon: (type: string) => string;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

export const ServerCard: React.FC<ServerCardProps> = ({
  server,
  darkMode,
  onSelect,
  getStatusIcon,
  getServerTypeIcon,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection
}) => {
  const queryClient = useQueryClient();

  // Individual health check mutation for this specific server
  const healthCheckMutation = useMutation({
    mutationFn: () => serverManagementApi.performHealthCheck(server.id),
    onSuccess: (newHealthCheck) => {
      // Update the specific server in the cache with new health data
      queryClient.setQueryData(['managed-servers'], (oldServers: ManagedServer[] | undefined) => {
        if (!oldServers) return oldServers;

        return oldServers.map(s => {
          if (s.id === server.id) {
            return {
              ...s,
              healthChecks: [newHealthCheck, ...(s.healthChecks || [])],
              lastCheckTime: newHealthCheck.checkTime,
              status: newHealthCheck.isHealthy ? 'Online' :
                (newHealthCheck.cpuUsage && newHealthCheck.cpuUsage > 90) ||
                (newHealthCheck.memoryUsage && newHealthCheck.memoryUsage > 90) ||
                (newHealthCheck.diskUsage && newHealthCheck.diskUsage > 95) ? 'Critical' :
                  (newHealthCheck.cpuUsage && newHealthCheck.cpuUsage > 80) ||
                  (newHealthCheck.memoryUsage && newHealthCheck.memoryUsage > 80) ||
                  (newHealthCheck.diskUsage && newHealthCheck.diskUsage > 80) ? 'Warning' : 'Online'
            };
          }
          return s;
        });
      });

      // Also update the alerts if needed
      queryClient.invalidateQueries({ queryKey: ['server-alerts'] });
    },
  });

  // Individual update check mutation for this specific server
  const updateCheckMutation = useMutation({
    mutationFn: () => serverManagementApi.checkUpdates(server.id),
    onSuccess: (newUpdateReport) => {
      // Update the specific server in the cache with new update data
      queryClient.setQueryData(['managed-servers'], (oldServers: ManagedServer[] | undefined) => {
        if (!oldServers) return oldServers;

        return oldServers.map(s => {
          if (s.id === server.id) {
            return {
              ...s,
              updateReports: [newUpdateReport, ...(s.updateReports || [])]
            };
          }
          return s;
        });
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Online': return 'border-green-500/50 bg-green-500/10';
      case 'Warning': return 'border-yellow-500/50 bg-yellow-500/10';
      case 'Critical': return 'border-red-500/50 bg-red-500/10';
      case 'Offline': return 'border-gray-500/50 bg-gray-500/10';
      default: return 'border-gray-600/50 bg-gray-600/10';
    }
  };

  const latestHealthCheck = server.healthChecks?.[0];
  const latestUpdateReport = server.updateReports?.[0];

  return (
    <div 
      className={`rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] cursor-pointer relative ${
        darkMode
          ? 'bg-gray-800/50 border-gray-700/50 shadow-lg shadow-gray-900/20 hover:shadow-gray-900/40'
          : 'bg-white/80 border-gray-200/50 shadow-lg shadow-gray-200/20 hover:shadow-gray-200/40'
      } ${getStatusColor(server.status)} ${
        isSelected ? (darkMode ? 'ring-2 ring-blue-400' : 'ring-2 ring-blue-500') : ''
      }`}
      onClick={() => onSelect(server)}
    >
      {/* Selection Checkbox */}
      {isSelectionMode && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelection?.();
            }}
            className={`p-1 rounded ${
              darkMode ? 'hover:bg-gray-600/50' : 'hover:bg-gray-100/50'
            }`}
          >
            {isSelected ? (
              <CheckSquare className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            ) : (
              <Square className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            )}
          </button>
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">
              {getServerTypeIcon(server.type)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {server.name}
                </h3>
                {server.isDashboardServer && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    darkMode
                      ? 'bg-blue-900/50 text-blue-300 border border-blue-600/50'
                      : 'bg-blue-100 text-blue-700 border border-blue-300'
                  }`}>
                    Dashboard
                  </span>
                )}
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {server.hostAddress}
              </p>
            </div>
          </div>

          {!isSelectionMode && (
            <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${
              server.status === 'Online' ? 'text-green-400 bg-green-500/20' :
                server.status === 'Warning' ? 'text-yellow-400 bg-yellow-500/20' :
                  server.status === 'Critical' ? 'text-red-400 bg-red-500/20' :
                    'text-gray-400 bg-gray-500/20'
            }`}>
              {getStatusIcon(server.status)}
              <span>{server.status}</span>
            </div>
          )}
        </div>

        {/* Metrics */}
        {latestHealthCheck && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className={`text-center p-3 rounded-lg ${
              darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'
            }`}>
              <Cpu className={`w-4 h-4 mx-auto mb-1 ${
                (latestHealthCheck.cpuUsage || 0) > 80 ? 'text-red-400' : 'text-blue-400'
              }`} />
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                CPU
              </p>
              <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {latestHealthCheck.cpuUsage?.toFixed(1) || 'N/A'}%
              </p>
            </div>

            <div className={`text-center p-3 rounded-lg ${
              darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'
            }`}>
              <MemoryStick className={`w-4 h-4 mx-auto mb-1 ${
                (latestHealthCheck.memoryUsage || 0) > 80 ? 'text-red-400' : 'text-green-400'
              }`} />
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Memory
              </p>
              <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {latestHealthCheck.memoryUsage?.toFixed(1) || 'N/A'}%
              </p>
            </div>

            <div className={`text-center p-3 rounded-lg ${
              darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'
            }`}>
              <HardDrive className={`w-4 h-4 mx-auto mb-1 ${
                (latestHealthCheck.diskUsage || 0) > 80 ? 'text-red-400' : 'text-purple-400'
              }`} />
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Disk
              </p>
              <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {latestHealthCheck.diskUsage?.toFixed(1) || 'N/A'}%
              </p>
            </div>
          </div>
        )}

        {/* Update info */}
        {latestUpdateReport && latestUpdateReport.availableUpdates > 0 && (
          <div className={`flex items-center justify-between p-3 rounded-lg mb-4 ${
            latestUpdateReport.securityUpdates > 0
              ? 'bg-red-500/10 border border-red-500/20'
              : 'bg-yellow-500/10 border border-yellow-500/20'
          }`}>
            <div className="flex items-center space-x-2">
              <Shield className={`w-4 h-4 ${
                latestUpdateReport.securityUpdates > 0 ? 'text-red-400' : 'text-yellow-400'
              }`} />
              <span className={`text-sm font-medium ${
                latestUpdateReport.securityUpdates > 0 ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {latestUpdateReport.availableUpdates} updates
                {latestUpdateReport.securityUpdates > 0 &&
                  ` (${latestUpdateReport.securityUpdates} security)`
                }
              </span>
            </div>
          </div>
        )}

        {/* Actions - Hide in selection mode */}
        {!isSelectionMode && (
          <div className="flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                healthCheckMutation.mutate();
              }}
              disabled={healthCheckMutation.isPending}
              className={`flex items-center flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                darkMode
                  ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white'
                  : 'bg-gray-100/50 hover:bg-gray-200/50 text-gray-700 hover:text-gray-900'
              }`}
            >
              {healthCheckMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Activity className="w-4 h-4 mr-2" />
              )}
              {healthCheckMutation.isPending ? 'Checking...' : 'Health Check'}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                updateCheckMutation.mutate();
              }}
              disabled={updateCheckMutation.isPending}
              className={`flex items-center flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                darkMode
                  ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white'
                  : 'bg-gray-100/50 hover:bg-gray-200/50 text-gray-700 hover:text-gray-900'
              }`}
            >
              {updateCheckMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Shield className="w-4 h-4 mr-2" />
              )}
              {updateCheckMutation.isPending ? 'Checking...' : 'Check Updates'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};