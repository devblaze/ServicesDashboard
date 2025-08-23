import React, { useState } from 'react';
import type { JSX } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Server, 
  Plus, 
  Activity, 
  AlertTriangle, 
  Shield, 
  HardDrive,
  Cpu,
  MemoryStick,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { serverManagementApi } from '../services/serverManagementApi';
import type { ManagedServer } from '../types/ServerManagementInterfaces';

interface ServerManagementProps {
  darkMode?: boolean;
}

export const ServerManagement: React.FC<ServerManagementProps> = ({ darkMode = true }) => {
  const [selectedServer, setSelectedServer] = useState<ManagedServer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch servers with error handling
  const { data: servers = [], isLoading, error: serversError } = useQuery({
    queryKey: ['managed-servers'],
    queryFn: serverManagementApi.getServers,
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 1, // Only retry once to avoid spamming failed requests
    retryOnMount: false, // Don't retry immediately on mount
  });

  // Fetch alerts with error handling
  const { data: alerts = [], error: alertsError } = useQuery({
    queryKey: ['server-alerts'],
    queryFn: () => serverManagementApi.getAlerts(),
    refetchInterval: 10000, // Refresh every 10 seconds
    retry: 1,
    retryOnMount: false,
  });

  // Health check mutation
  const healthCheckMutation = useMutation({
    mutationFn: serverManagementApi.performHealthCheck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-servers'] });
    },
    onError: (error) => {
      console.error('Health check failed:', error);
    }
  });

  // Update check mutation
  const updateCheckMutation = useMutation({
    mutationFn: serverManagementApi.checkUpdates,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-servers'] });
    },
    onError: (error) => {
      console.error('Update check failed:', error);
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Online': return <CheckCircle2 className="w-4 h-4" />;
      case 'Warning': return <AlertTriangle className="w-4 h-4" />;
      case 'Critical': return <XCircle className="w-4 h-4" />;
      case 'Offline': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getServerTypeIcon = (type: string) => {
    switch (type) {
      case 'RaspberryPi': return '🥧';
      case 'VirtualMachine': return '💻';
      case 'Container': return '📦';
      default: return '🖥️';
    }
  };

  // Show error state if there are API issues
  if (serversError || alertsError) {
    return (
      <div className={`rounded-2xl border backdrop-blur-sm p-6 ${
        darkMode 
          ? 'bg-gray-800/50 border-gray-700/50 shadow-lg shadow-gray-900/20' 
          : 'bg-white/80 border-gray-200/50 shadow-lg shadow-gray-200/20'
      }`}>
        <div className="flex items-center space-x-4 mb-6">
          <div className={`p-3 rounded-xl ${
            darkMode ? 'bg-red-900/50' : 'bg-red-100/50'
          }`}>
            <AlertTriangle className={`w-6 h-6 ${
              darkMode ? 'text-red-400' : 'text-red-600'
            }`} />
          </div>
          <div>
            <h2 className={`text-xl font-semibold ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Server Management - Connection Error
            </h2>
            <p className={`text-sm ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Unable to connect to the server management API
            </p>
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${
          darkMode
            ? 'bg-red-900/20 border-red-600/50 text-red-300'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <div className="space-y-2">
            <h3 className="font-medium">Connection Issues:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Server may not be running on localhost:5000</li>
              <li>CORS policy may need to be configured on the server</li>
              <li>API endpoints may not be implemented yet</li>
            </ul>
            {serversError && (
              <div className="mt-3 p-2 rounded bg-black/10 font-mono text-xs">
                Server Error: {String(serversError)}
              </div>
            )}
            {alertsError && (
              <div className="mt-3 p-2 rounded bg-black/10 font-mono text-xs">
                Alerts Error: {String(alertsError)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 rounded-2xl border ${
        darkMode 
          ? 'bg-gray-800/50 border-gray-700/50 backdrop-blur-sm' 
          : 'bg-white/80 border-gray-200/50 backdrop-blur-sm shadow-lg'
      }`}>
        <div className="text-center">
          <RefreshCw className={`w-8 h-8 animate-spin mx-auto mb-3 ${
            darkMode ? 'text-blue-400' : 'text-blue-600'
          }`} />
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Loading servers...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className={`rounded-2xl border backdrop-blur-sm p-6 ${
        darkMode 
          ? 'bg-gray-800/50 border-gray-700/50 shadow-lg shadow-gray-900/20' 
          : 'bg-white/80 border-gray-200/50 shadow-lg shadow-gray-200/20'
      }`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${
              darkMode ? 'bg-blue-900/50' : 'bg-blue-100/50'
            }`}>
              <Server className={`w-6 h-6 ${
                darkMode ? 'text-blue-400' : 'text-blue-600'
              }`} />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Server Management
              </h2>
              <p className={`text-sm ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Monitor and manage your servers and Raspberry Pi devices
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowAddModal(true)}
            className={`flex items-center px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
              darkMode
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40'
                : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
            }`}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Server
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl ${
            darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'
          }`}>
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Online
                </p>
                <p className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {servers.filter(s => s.status === 'Online').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className={`p-4 rounded-xl ${
            darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'
          }`}>
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Warnings
                </p>
                <p className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {servers.filter(s => s.status === 'Warning').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className={`p-4 rounded-xl ${
            darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'
          }`}>
            <div className="flex items-center space-x-3">
              <XCircle className="w-5 h-5 text-red-400" />
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Critical
                </p>
                <p className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {servers.filter(s => s.status === 'Critical').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className={`p-4 rounded-xl ${
            darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'
          }`}>
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Active Alerts
                </p>
                <p className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {alerts.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Servers Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {servers.map((server) => (
          <ServerCard 
            key={server.id}
            server={server}
            darkMode={darkMode}
            onHealthCheck={(id) => healthCheckMutation.mutate(id)}
            onUpdateCheck={(id) => updateCheckMutation.mutate(id)}
            onSelect={setSelectedServer}
            getStatusIcon={getStatusIcon}
            getServerTypeIcon={getServerTypeIcon}
          />
        ))}
      </div>

      {/* Empty state */}
      {servers.length === 0 && (
        <div className={`text-center py-12 rounded-2xl border ${
          darkMode 
            ? 'bg-gray-800/50 border-gray-700/50 backdrop-blur-sm' 
            : 'bg-white/80 border-gray-200/50 backdrop-blur-sm shadow-lg'
        }`}>
          <Server className={`w-16 h-16 mx-auto mb-4 ${
            darkMode ? 'text-gray-600' : 'text-gray-400'
          }`} />
          <h3 className={`text-xl font-semibold mb-2 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            No servers configured
          </h3>
          <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Add your servers and Raspberry Pi devices to start monitoring
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className={`inline-flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              darkMode
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/25'
                : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25'
            }`}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Your First Server
          </button>
        </div>
      )}

      {/* TODO: Add Server Modal - Create this component */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-xl max-w-md w-full mx-4 ${
            darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}>
            <h3 className="text-lg font-semibold mb-4">Add Server Modal</h3>
            <p className="text-sm text-gray-500 mb-4">
              This modal component needs to be implemented.
            </p>
            <button
              onClick={() => setShowAddModal(false)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* TODO: Server Details Modal - Create this component */}
      {selectedServer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-xl max-w-2xl w-full mx-4 ${
            darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}>
            <h3 className="text-lg font-semibold mb-4">Server Details: {selectedServer.name}</h3>
            <p className="text-sm text-gray-500 mb-4">
              This modal component needs to be implemented.
            </p>
            <button
              onClick={() => setSelectedServer(null)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Server Card Component
interface ServerCardProps {
  server: ManagedServer;
  darkMode: boolean;
  onHealthCheck: (id: number) => void;
  onUpdateCheck: (id: number) => void;
  onSelect: (server: ManagedServer) => void;
  getStatusIcon: (status: string) => JSX.Element;
  getServerTypeIcon: (type: string) => string;
}

const ServerCard: React.FC<ServerCardProps> = ({ 
  server, 
  darkMode, 
  onHealthCheck, 
  onUpdateCheck, 
  onSelect,
  getStatusIcon,
  getServerTypeIcon
}) => {
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
    <div className={`rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] cursor-pointer ${
      darkMode 
        ? 'bg-gray-800/50 border-gray-700/50 shadow-lg shadow-gray-900/20 hover:shadow-gray-900/40' 
        : 'bg-white/80 border-gray-200/50 shadow-lg shadow-gray-200/20 hover:shadow-gray-200/40'
    } ${getStatusColor(server.status)}`}
    onClick={() => onSelect(server)}>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <div className={`text-2xl`}>
              {getServerTypeIcon(server.type)}
            </div>
            <div>
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {server.name}
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {server.hostAddress}
              </p>
            </div>
          </div>
          
          <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${
            server.status === 'Online' ? 'text-green-400 bg-green-500/20' :
            server.status === 'Warning' ? 'text-yellow-400 bg-yellow-500/20' :
            server.status === 'Critical' ? 'text-red-400 bg-red-500/20' :
            'text-gray-400 bg-gray-500/20'
          }`}>
            {getStatusIcon(server.status)}
            <span>{server.status}</span>
          </div>
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

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onHealthCheck(server.id);
            }}
            className={`flex items-center flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              darkMode
                ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white'
                : 'bg-gray-100/50 hover:bg-gray-200/50 text-gray-700 hover:text-gray-900'
            }`}
          >
            <Activity className="w-4 h-4 mr-2" />
            Health Check
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdateCheck(server.id);
            }}
            className={`flex items-center flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              darkMode
                ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white'
                : 'bg-gray-100/50 hover:bg-gray-200/50 text-gray-700 hover:text-gray-900'
            }`}
          >
            <Shield className="w-4 h-4 mr-2" />
            Check Updates
          </button>
        </div>
      </div>
    </div>
  );
};