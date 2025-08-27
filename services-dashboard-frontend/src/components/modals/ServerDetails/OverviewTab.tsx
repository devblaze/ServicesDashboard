import React from 'react';
import { Activity, Cpu, MemoryStick, HardDrive, Shield } from 'lucide-react';
import type { ManagedServer, ServerHealthCheck, UpdateReport } from '../../../types/ServerManagement';

interface OverviewTabProps {
  server: ManagedServer;
  darkMode: boolean;
  latestHealthCheck?: ServerHealthCheck;
  latestUpdateReport?: UpdateReport;
}

interface SystemInfo {
  uptime?: string;
  loadAverage?: string;
  totalMemory?: string;
  [key: string]: unknown;
}

const getSystemInfo = (systemInfo: string | SystemInfo | undefined | null): SystemInfo | null => {
  if (!systemInfo) return null;
  if (typeof systemInfo === 'object') return systemInfo;
  try {
    return JSON.parse(systemInfo) as SystemInfo;
  } catch {
    return null;
  }
};

export const OverviewTab: React.FC<OverviewTabProps> = ({
  server,
  darkMode,
  latestHealthCheck,
  latestUpdateReport
}) => {
  const systemInfo = getSystemInfo(server.systemInfo);

  const MetricCard: React.FC<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: number | undefined;
    color: string;
  }> = ({ icon: Icon, label, value, color }) => (
    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'}`}>
      <div className="flex items-center space-x-2 mb-2">
        <Icon className={`w-4 h-4 ${(value || 0) > 80 ? 'text-red-400' : color}`} />
        <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          {label}
        </span>
      </div>
      <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        {value?.toFixed(1) || 'N/A'}%
      </p>
      <div className={`w-full rounded-full h-2 mt-2 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            (value || 0) > 80 ? 'bg-red-500' : (value || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${value || 0}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        System Overview
      </h3>

      {latestHealthCheck ? (
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            icon={Cpu}
            label="CPU Usage"
            value={latestHealthCheck.cpuUsage}
            color="text-blue-400"
          />
          <MetricCard
            icon={MemoryStick}
            label="Memory Usage"
            value={latestHealthCheck.memoryUsage}
            color="text-green-400"
          />
          <MetricCard
            icon={HardDrive}
            label="Disk Usage"
            value={latestHealthCheck.diskUsage}
            color="text-purple-400"
          />
        </div>
      ) : (
        <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No health check data available</p>
        </div>
      )}

      {latestUpdateReport && latestUpdateReport.availableUpdates > 0 && (
        <div className={`p-4 rounded-lg border ${
          latestUpdateReport.securityUpdates > 0
            ? darkMode ? 'bg-red-900/20 border-red-600/50' : 'bg-red-50 border-red-200'
            : darkMode ? 'bg-yellow-900/20 border-yellow-600/50' : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center space-x-2 mb-2">
            <Shield className={`w-4 h-4 ${
              latestUpdateReport.securityUpdates > 0 ? 'text-red-400' : 'text-yellow-400'
            }`} />
            <span className={`font-medium ${
              latestUpdateReport.securityUpdates > 0 ? 'text-red-400' : 'text-yellow-400'
            }`}>
              Updates Available
            </span>
          </div>
          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {latestUpdateReport.availableUpdates} total updates available
            {latestUpdateReport.securityUpdates > 0 && 
              ` (${latestUpdateReport.securityUpdates} security updates)`
            }
          </p>
        </div>
      )}

      {systemInfo && (
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'}`}>
          <h4 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            System Information
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Operating System:
              </span>
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                {server.operatingSystem || 'Unknown'}
              </p>
            </div>
            <div>
              <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Uptime:
              </span>
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                {systemInfo.uptime || 'Unknown'}
              </p>
            </div>
            <div>
              <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Load Average:
              </span>
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                {systemInfo.loadAverage || 'Unknown'}
              </p>
            </div>
            <div>
              <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Total Memory:
              </span>
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                {systemInfo.totalMemory || 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};