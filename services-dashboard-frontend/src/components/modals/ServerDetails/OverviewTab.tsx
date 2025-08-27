import React from 'react';
import { Activity, Cpu, MemoryStick, HardDrive, Shield, Monitor, Network, Clock, Server } from 'lucide-react';
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
  operatingSystem?: string;
  osVersion?: string;
  architecture?: string;
  kernelVersion?: string;
  hostname?: string;
  systemUptime?: string;
  installedPackages?: number;
  runningServices?: string[];
  networkInterfaces?: string[];
  systemLoad?: string;
  diskInfo?: string[];
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

const formatMemorySize = (memoryString: string | undefined): string => {
  if (!memoryString) return 'Unknown';
  
  // Try to extract GB value from strings like "16GB", "16 GB", "16384MB", etc.
  const gbMatch = memoryString.match(/(\d+(?:\.\d+)?)\s*GB/i);
  if (gbMatch) {
    return `${gbMatch[1]} GB`;
  }
  
  const mbMatch = memoryString.match(/(\d+)\s*MB/i);
  if (mbMatch) {
    const gb = (parseInt(mbMatch[1]) / 1024).toFixed(1);
    return `${gb} GB`;
  }
  
  const kbMatch = memoryString.match(/(\d+)\s*KB/i);
  if (kbMatch) {
    const gb = (parseInt(kbMatch[1]) / 1024 / 1024).toFixed(2);
    return `${gb} GB`;
  }
  
  return memoryString;
};

const formatUptime = (uptime: string | undefined): string => {
  if (!uptime) return 'Unknown';
  return uptime;
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
    additionalInfo?: string;
  }> = ({ icon: Icon, label, value, color, additionalInfo }) => (
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
      {additionalInfo && (
        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {additionalInfo}
        </p>
      )}
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

  const InfoCard: React.FC<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number | undefined;
    color: string;
  }> = ({ icon: Icon, label, value, color }) => (
    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'}`}>
      <div className="flex items-center space-x-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          {label}
        </span>
      </div>
      <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        {value || 'N/A'}
      </p>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        System Overview
      </h3>

      {/* Performance Metrics */}
      {latestHealthCheck ? (
        <div className="space-y-4">
          <h4 className={`text-md font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            Performance Metrics
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <MetricCard
              icon={Cpu}
              label="CPU Usage"
              value={latestHealthCheck.cpuUsage}
              color="text-blue-400"
              additionalInfo={systemInfo?.systemLoad ? `Load: ${systemInfo.systemLoad}` : undefined}
            />
            <MetricCard
              icon={MemoryStick}
              label="Memory Usage"
              value={latestHealthCheck.memoryUsage}
              color="text-green-400"
              additionalInfo={systemInfo?.totalMemory ? `Total: ${formatMemorySize(systemInfo.totalMemory)}` : undefined}
            />
            <MetricCard
              icon={HardDrive}
              label="Disk Usage"
              value={latestHealthCheck.diskUsage}
              color="text-purple-400"
            />
          </div>
        </div>
      ) : (
        <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No health check data available</p>
        </div>
      )}

      {/* System Information */}
      {systemInfo && (
        <div className="space-y-4">
          <h4 className={`text-md font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            System Information
          </h4>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {systemInfo.operatingSystem && (
              <InfoCard
                icon={Monitor}
                label="Operating System"
                value={`${systemInfo.operatingSystem}${systemInfo.osVersion ? ` ${systemInfo.osVersion}` : ''}`}
                color="text-blue-400"
              />
            )}
            {systemInfo.architecture && (
              <InfoCard
                icon={Cpu}
                label="Architecture"
                value={systemInfo.architecture}
                color="text-green-400"
              />
            )}
            {systemInfo.kernelVersion && (
              <InfoCard
                icon={Server}
                label="Kernel Version"
                value={systemInfo.kernelVersion}
                color="text-purple-400"
              />
            )}
            {(systemInfo.systemUptime || systemInfo.uptime) && (
              <InfoCard
                icon={Clock}
                label="Uptime"
                value={formatUptime(systemInfo.systemUptime || systemInfo.uptime)}
                color="text-orange-400"
              />
            )}
            {systemInfo.totalMemory && (
              <InfoCard
                icon={MemoryStick}
                label="Total Memory"
                value={formatMemorySize(systemInfo.totalMemory)}
                color="text-green-400"
              />
            )}
            {typeof systemInfo.installedPackages === 'number' && (
              <InfoCard
                icon={HardDrive}
                label="Installed Packages"
                value={systemInfo.installedPackages}
                color="text-indigo-400"
              />
            )}
          </div>
        </div>
      )}

      {/* Network Information */}
      {systemInfo?.networkInterfaces && systemInfo.networkInterfaces.length > 0 && (
        <div className="space-y-4">
          <h4 className={`text-md font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            Network Interfaces
          </h4>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'}`}>
            <div className="flex items-center space-x-2 mb-3">
              <Network className="w-4 h-4 text-cyan-400" />
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Available Interfaces
              </span>
            </div>
            <div className="space-y-2">
              {systemInfo.networkInterfaces.slice(0, 5).map((iface, index) => (
                <div key={index} className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {iface}
                </div>
              ))}
              {systemInfo.networkInterfaces.length > 5 && (
                <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  ... and {systemInfo.networkInterfaces.length - 5} more
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Disk Information */}
      {systemInfo?.diskInfo && systemInfo.diskInfo.length > 0 && (
        <div className="space-y-4">
          <h4 className={`text-md font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            Storage Information
          </h4>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'}`}>
            <div className="flex items-center space-x-2 mb-3">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Disk Usage
              </span>
            </div>
            <div className="space-y-2">
              {systemInfo.diskInfo.slice(0, 3).map((disk, index) => (
                <div key={index} className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {disk}
                </div>
              ))}
              {systemInfo.diskInfo.length > 3 && (
                <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  ... and {systemInfo.diskInfo.length - 3} more
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Running Services */}
      {systemInfo?.runningServices && systemInfo.runningServices.length > 0 && (
        <div className="space-y-4">
          <h4 className={`text-md font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            Running Services
          </h4>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'}`}>
            <div className="flex items-center space-x-2 mb-3">
              <Activity className="w-4 h-4 text-green-400" />
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Active Services ({systemInfo.runningServices.length})
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {systemInfo.runningServices.slice(0, 10).map((service, index) => (
                <div key={index} className={`text-sm px-2 py-1 rounded ${
                  darkMode ? 'bg-gray-600/50 text-gray-300' : 'bg-gray-200/50 text-gray-700'
                }`}>
                  {service}
                </div>
              ))}
            </div>
            {systemInfo.runningServices.length > 10 && (
              <div className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                ... and {systemInfo.runningServices.length - 10} more services
              </div>
            )}
          </div>
        </div>
      )}

      {/* Updates Section */}
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

      {/* Basic System Info fallback */}
      {!systemInfo && server.operatingSystem && (
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'}`}>
          <h4 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            System Information
          </h4>
          <div className="text-sm">
            <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              Operating System:
            </span>
            <span className={`ml-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {server.operatingSystem}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};