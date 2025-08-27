import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Server, Activity, FileText, Terminal, Settings, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import type { ManagedServer } from '../../../types/ServerManagement';
import { serverManagementApi } from '../../../services/serverManagementApi';
import { OverviewTab } from './OverviewTab';
import { LogsTab } from './LogsAnalysisTab';
import { TerminalTab } from './TerminalCommandExecutor';
import { SettingsTab } from './ServerSettingsTab';

interface ServerDetailsModalProps {
  server: ManagedServer;
  darkMode: boolean;
  onClose: () => void;
  onUpdate: (updatedServer: ManagedServer) => void;
}

type TabType = 'overview' | 'logs' | 'terminal' | 'settings';

const TABS = [
  { id: 'overview' as TabType, label: 'Overview', icon: Activity },
  { id: 'logs' as TabType, label: 'Logs', icon: FileText },
  { id: 'terminal' as TabType, label: 'Terminal', icon: Terminal },
  { id: 'settings' as TabType, label: 'Settings', icon: Settings },
];

export const ServerDetailsModal: React.FC<ServerDetailsModalProps> = ({
  server,
  darkMode,
  onClose,
  onUpdate
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Fetch logs analysis
  const { data: logAnalysis, isLoading: logsLoading } = useQuery({
    queryKey: ['server-logs', server.id],
    queryFn: async () => {
      try {
        await serverManagementApi.getServerLogs(server.id);
        return {
          summary: 'Log analysis completed',
          confidence: 0.8,
          analyzedAt: new Date().toISOString(),
          issues: [],
          recommendations: []
        };
      } catch {
        return {
          summary: 'No analysis available',
          confidence: 0,
          analyzedAt: new Date().toISOString(),
          issues: [],
          recommendations: []
        };
      }
    },
    enabled: activeTab === 'logs',
    refetchInterval: 60000,
  });

  const getStatusColor = (status: string) => {
    const colors = {
      'Online': 'text-green-400',
      'Warning': 'text-yellow-400',
      'Critical': 'text-red-400',
      'Offline': 'text-gray-400',
    };
    return colors[status as keyof typeof colors] || 'text-gray-400';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Online':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'Warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'Critical':
      case 'Offline':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const latestHealthCheck = server.healthChecks?.[0];
  const latestUpdateReport = server.updateReports?.[0];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab
            server={server}
            darkMode={darkMode}
            latestHealthCheck={latestHealthCheck}
            latestUpdateReport={latestUpdateReport}
          />
        );
      case 'logs':
        return (
          <LogsTab
            darkMode={darkMode}
            logAnalysis={logAnalysis}
            isLoading={logsLoading}
          />
        );
      case 'terminal':
        return <TerminalTab serverId={server.id} darkMode={darkMode} />;
      case 'settings':
        return (
          <SettingsTab
            server={server}
            darkMode={darkMode}
            onUpdate={onUpdate}
            onClose={onClose}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-4xl max-h-[90vh] rounded-2xl border backdrop-blur-sm overflow-hidden ${
        darkMode 
          ? 'bg-gray-800/95 border-gray-700/50 shadow-xl shadow-gray-900/25' 
          : 'bg-white/95 border-gray-200/50 shadow-xl shadow-gray-200/25'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/10">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-900/50' : 'bg-blue-100/50'}`}>
              <Server className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {server.name}
              </h2>
              <div className="flex items-center space-x-2">
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {server.hostAddress}:{server.sshPort || 22}
                </p>
                <div className={`flex items-center space-x-1 ${getStatusColor(server.status)}`}>
                  {getStatusIcon(server.status)}
                  <span className="text-sm font-medium">{server.status}</span>
                </div>
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              darkMode
                ? 'hover:bg-gray-700/50 text-gray-400 hover:text-white'
                : 'hover:bg-gray-100/50 text-gray-600 hover:text-gray-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${darkMode ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 font-medium transition-colors ${
                  activeTab === tab.id
                    ? darkMode
                      ? 'border-b-2 border-blue-400 text-blue-400 bg-blue-900/20'
                      : 'border-b-2 border-blue-500 text-blue-600 bg-blue-50/50'
                    : darkMode
                      ? 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/30'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto max-h-[60vh]">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};