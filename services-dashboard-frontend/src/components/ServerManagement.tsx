import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Server,
  Plus,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { serverManagementApi } from '../services/serverManagementApi';
import type { ManagedServer, ServerAlert } from '../types/ServerManagement';
import { AddServerModal } from './modals/AddServerModal';
import { ServerCard } from './cards/ServerCard';
import { ServerDetailsModal } from './modals/ServerDetailsModal';

interface ServerManagementProps {
  darkMode?: boolean;
}

export const ServerManagement: React.FC<ServerManagementProps> = ({ darkMode = true }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedServerForDetails, setSelectedServerForDetails] = useState<ManagedServer | null>(null);

  const queryClient = useQueryClient();

  // Fetch servers
  const {
    data: servers = [],
    isLoading,
    error: serversError,
    isError
  } = useQuery<ManagedServer[], Error>({
    queryKey: ['managed-servers'],
    queryFn: () => serverManagementApi.getServers(),
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    retry: 1,
  });

  // Fetch alerts
  const {
    data: alerts = [],
    error: alertsError
  } = useQuery<ServerAlert[], Error>({
    queryKey: ['server-alerts'],
    queryFn: () => serverManagementApi.getAlerts(),
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
    retry: 1,
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
  if (isError && serversError) {
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
              <li>Server may not be running on the expected port</li>
              <li>CORS policy may need to be configured on the server</li>
              <li>API endpoints may not be implemented yet</li>
            </ul>
            <div className="mt-3 p-2 rounded bg-black/10 font-mono text-xs">
              Server Error: {String(serversError)}
            </div>
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
                Monitor and manage your servers and devices.
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
                  {servers.filter((s: ManagedServer) => s.status === 'Online').length}
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
                  {servers.filter((s: ManagedServer) => s.status === 'Warning').length}
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
                  {servers.filter((s: ManagedServer) => s.status === 'Critical').length}
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
        {servers.map((server: ManagedServer) => (
          <ServerCard
            key={server.id}
            server={server}
            darkMode={darkMode}
            onSelect={(server) => setSelectedServerForDetails(server)}
            getStatusIcon={getStatusIcon}
            getServerTypeIcon={getServerTypeIcon}
          />
        ))}
      </div>

      {/* Empty state */}
      {servers.length === 0 && !isLoading && !isError && (
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

      {/* Add Server Modal */}
      <AddServerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        darkMode={darkMode}
      />

      {/* Server Details Modal - Remove the old one and keep this updated one */}
      {selectedServerForDetails && (
        <ServerDetailsModal
          server={selectedServerForDetails}
          darkMode={darkMode}
          onClose={() => setSelectedServerForDetails(null)}
          onUpdate={(updatedServer) => {
            // Update the server in the cache
            queryClient.setQueryData(['managed-servers'], (oldServers: ManagedServer[] | undefined) => {
              if (!oldServers) return oldServers;
              return oldServers.map(s => s.id === updatedServer.id ? updatedServer : s);
            });
            setSelectedServerForDetails(updatedServer);
          }}
        />
      )}
    </div>
  );
};