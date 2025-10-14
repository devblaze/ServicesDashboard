import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Server,
  Plus,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Shield,
  Loader2,
  CheckSquare,
  Square,
  Network,
  List,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { serverManagementApi } from '../../services/serverManagementApi.ts';
import type { ManagedServer, ServerAlert } from '../../types/ServerManagement.ts';
import { AddServerModal } from '../modals/AddServerModal.tsx';
import { ServerCard } from '../cards/ServerCard.tsx';
import { ServerDetailsModal } from '../modals/ServerDetails/ServerDetailsModal.tsx';

interface ServerManagementProps {
  darkMode?: boolean;
}

export const ServerManagement: React.FC<ServerManagementProps> = ({ darkMode = true }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedServerForDetails, setSelectedServerForDetails] = useState<ManagedServer | null>(null);
  const [selectedServerIds, setSelectedServerIds] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isHierarchicalView, setIsHierarchicalView] = useState(false);
  const [collapsedParents, setCollapsedParents] = useState<Set<number>>(new Set());

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
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
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

  // Bulk health check mutation
  const bulkHealthCheckMutation = useMutation({
    mutationFn: (serverIds: number[]) => 
      Promise.all(serverIds.map(id => serverManagementApi.performHealthCheck(id))),
    onSuccess: (results, serverIds) => {
      // Update all servers in the cache
      queryClient.setQueryData(['managed-servers'], (oldServers: ManagedServer[] | undefined) => {
        if (!oldServers) return oldServers;

        return oldServers.map(server => {
          const resultIndex = serverIds.findIndex(id => id === server.id);
          if (resultIndex >= 0) {
            const newHealthCheck = results[resultIndex];
            return {
              ...server,
              healthChecks: [newHealthCheck, ...(server.healthChecks || [])],
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
          return server;
        });
      });

      queryClient.invalidateQueries({ queryKey: ['server-alerts'] });
      // Clear selection after successful bulk operation
      setSelectedServerIds(new Set());
      setIsSelectionMode(false);
    },
  });

  // Bulk update check mutation
  const bulkUpdateCheckMutation = useMutation({
    mutationFn: (serverIds: number[]) =>
      Promise.all(serverIds.map(id => serverManagementApi.checkUpdates(id))),
    onSuccess: (results, serverIds) => {
      // Update all servers in the cache
      queryClient.setQueryData(['managed-servers'], (oldServers: ManagedServer[] | undefined) => {
        if (!oldServers) return oldServers;

        return oldServers.map(server => {
          const resultIndex = serverIds.findIndex(id => id === server.id);
          if (resultIndex >= 0) {
            const newUpdateReport = results[resultIndex];
            return {
              ...server,
              updateReports: [newUpdateReport, ...(server.updateReports || [])]
            };
          }
          return server;
        });
      });

      // Clear selection after successful bulk operation
      setSelectedServerIds(new Set());
      setIsSelectionMode(false);
    },
  });

  // Automatically check health for servers with Unknown status when page loads
  useEffect(() => {
    if (!isLoading && servers.length > 0) {
      const unknownServers = servers.filter(s => s.status === 'Unknown');
      if (unknownServers.length > 0) {
        const unknownServerIds = unknownServers.map(s => s.id);
        bulkHealthCheckMutation.mutate(unknownServerIds);
      }
    }
  }, [isLoading, servers.length]); // Only run when loading completes or server count changes

  const toggleServerSelection = (serverId: number) => {
    const newSelection = new Set(selectedServerIds);
    if (newSelection.has(serverId)) {
      newSelection.delete(serverId);
    } else {
      newSelection.add(serverId);
    }
    setSelectedServerIds(newSelection);
  };

  const selectAllServers = () => {
    if (selectedServerIds.size === servers.length) {
      setSelectedServerIds(new Set());
    } else {
      setSelectedServerIds(new Set(servers.map(s => s.id)));
    }
  };

  const handleBulkHealthCheck = () => {
    if (selectedServerIds.size > 0) {
      bulkHealthCheckMutation.mutate(Array.from(selectedServerIds));
    }
  };

  const handleBulkUpdateCheck = () => {
    if (selectedServerIds.size > 0) {
      bulkUpdateCheckMutation.mutate(Array.from(selectedServerIds));
    }
  };

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

  // Organize servers hierarchically or by group
  const { organizedServers, childrenMap, groupedServers } = useMemo(() => {
    if (!isHierarchicalView) {
      // Group servers by ServerGroup
      const onPremiseServers = servers.filter(s => s.group === 'OnPremise');
      const remoteServers = servers.filter(s => s.group === 'Remote');

      return {
        organizedServers: servers,
        childrenMap: new Map(),
        groupedServers: {
          onPremise: onPremiseServers,
          remote: remoteServers
        }
      };
    }

    // Separate parent servers (those without a parent) and child servers
    const parentServers = servers.filter(s => !s.parentServerId);
    const childServers = servers.filter(s => s.parentServerId);

    // Create a map of parent ID to children
    const childrenMap = new Map<number, ManagedServer[]>();
    childServers.forEach(child => {
      if (child.parentServerId) {
        const existing = childrenMap.get(child.parentServerId) || [];
        childrenMap.set(child.parentServerId, [...existing, child]);
      }
    });

    // Build the hierarchical list
    const result: Array<ManagedServer & { isChild?: boolean; isLastChild?: boolean; parentId?: number }> = [];

    parentServers.forEach(parent => {
      result.push(parent);
      const children = childrenMap.get(parent.id) || [];

      // Only add children if parent is not collapsed
      if (!collapsedParents.has(parent.id)) {
        children.forEach((child, index) => {
          result.push({
            ...child,
            isChild: true,
            isLastChild: index === children.length - 1,
            parentId: parent.id
          });
        });
      }
    });

    return {
      organizedServers: result,
      childrenMap,
      groupedServers: {
        onPremise: [],
        remote: []
      }
    };
  }, [servers, isHierarchicalView, collapsedParents]);

  const toggleParentCollapse = (parentId: number) => {
    const newCollapsed = new Set(collapsedParents);
    if (newCollapsed.has(parentId)) {
      newCollapsed.delete(parentId);
    } else {
      newCollapsed.add(parentId);
    }
    setCollapsedParents(newCollapsed);
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

          <div className="flex items-center space-x-3">
            {servers.length > 0 && (
              <>
                <button
                  onClick={() => setIsHierarchicalView(!isHierarchicalView)}
                  className={`flex items-center px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                    darkMode
                      ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white'
                      : 'bg-gray-100/50 hover:bg-gray-200/50 text-gray-700 hover:text-gray-900'
                  }`}
                  title={isHierarchicalView ? 'Switch to flat view' : 'Switch to hierarchical view'}
                >
                  {isHierarchicalView ? (
                    <>
                      <List className="w-4 h-4 mr-2" />
                      Flat View
                    </>
                  ) : (
                    <>
                      <Network className="w-4 h-4 mr-2" />
                      Hierarchy
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setIsSelectionMode(!isSelectionMode);
                    setSelectedServerIds(new Set());
                  }}
                  className={`flex items-center px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                    isSelectionMode
                      ? darkMode
                        ? 'bg-gray-600 text-white'
                        : 'bg-gray-500 text-white'
                      : darkMode
                        ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white'
                        : 'bg-gray-100/50 hover:bg-gray-200/50 text-gray-700 hover:text-gray-900'
                  }`}
                >
                  {isSelectionMode ? (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel Selection
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Select Servers
                    </>
                  )}
                </button>
              </>
            )}

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
        </div>

        {/* Selection Controls */}
        {isSelectionMode && servers.length > 0 && (
          <div className={`mb-6 p-4 rounded-xl border ${
            darkMode 
              ? 'bg-blue-900/20 border-blue-600/50' 
              : 'bg-blue-50/50 border-blue-200/50'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={selectAllServers}
                  className={`flex items-center space-x-2 text-sm font-medium ${
                    darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  {selectedServerIds.size === servers.length ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  <span>
                    {selectedServerIds.size === servers.length ? 'Deselect All' : 'Select All'}
                  </span>
                </button>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {selectedServerIds.size} of {servers.length} servers selected
                </span>
              </div>
            </div>

            {selectedServerIds.size > 0 && (
              <div className="flex space-x-3">
                <button
                  onClick={handleBulkHealthCheck}
                  disabled={bulkHealthCheckMutation.isPending}
                  className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode
                      ? 'bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/50'
                      : 'bg-green-100/50 hover:bg-green-200/50 text-green-700 border border-green-300'
                  }`}
                >
                  {bulkHealthCheckMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Activity className="w-4 h-4 mr-2" />
                  )}
                  {bulkHealthCheckMutation.isPending ? 'Checking...' : `Health Check (${selectedServerIds.size})`}
                </button>

                <button
                  onClick={handleBulkUpdateCheck}
                  disabled={bulkUpdateCheckMutation.isPending}
                  className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode
                      ? 'bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-600/50'
                      : 'bg-yellow-100/50 hover:bg-yellow-200/50 text-yellow-700 border border-yellow-300'
                  }`}
                >
                  {bulkUpdateCheckMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="w-4 h-4 mr-2" />
                  )}
                  {bulkUpdateCheckMutation.isPending ? 'Checking...' : `Check Updates (${selectedServerIds.size})`}
                </button>
              </div>
            )}
          </div>
        )}

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

      {/* Servers Grid or Grouped View */}
      {isHierarchicalView ? (
        <div className="space-y-2">
          {organizedServers.map((server: ManagedServer & { isChild?: boolean; isLastChild?: boolean; parentId?: number }) => {
            const children = childrenMap.get(server.id) || [];
            const hasChildren = children.length > 0;
            const isParent = !server.isChild && hasChildren;
            const isCollapsed = collapsedParents.has(server.id);

            return (
              <div key={server.id}>
                {/* Parent Server Header with Child Count */}
                {isParent && (
                  <div
                    className={`mb-2 p-3 rounded-lg border cursor-pointer transition-all ${
                      darkMode
                        ? 'bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-700/50 hover:border-blue-600/70'
                        : 'bg-gradient-to-r from-blue-50/50 to-purple-50/50 border-blue-200/50 hover:border-blue-300/70'
                    }`}
                    onClick={() => toggleParentCollapse(server.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {isCollapsed ? (
                          <ChevronRight className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        ) : (
                          <ChevronDown className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        )}
                        <Server className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        <div>
                          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {server.name}
                          </h3>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {server.hostAddress}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          darkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {children.length} {children.length === 1 ? 'VM' : 'VMs'}
                        </div>
                        {getStatusIcon(server.status)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Server Card Container */}
                <div className={server.isChild ? 'ml-12 relative' : ''}>
                  {/* Hierarchical visual indicators for child servers */}
                  {server.isChild && (
                    <div className={`absolute -left-12 top-0 bottom-0 w-12 flex items-center ${
                      darkMode ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      <div className="relative w-full h-full">
                        {/* Vertical line */}
                        {!server.isLastChild && (
                          <div className={`absolute left-6 top-0 bottom-0 w-px ${
                            darkMode ? 'bg-gray-700' : 'bg-gray-300'
                          }`} />
                        )}
                        {/* Horizontal line */}
                        <div className={`absolute left-6 top-1/2 w-6 h-px ${
                          darkMode ? 'bg-gray-700' : 'bg-gray-300'
                        }`} />
                        {/* Corner for last child */}
                        {server.isLastChild && (
                          <div className={`absolute left-6 top-0 w-px h-1/2 ${
                            darkMode ? 'bg-gray-700' : 'bg-gray-300'
                          }`} />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Only show card if not a parent with children, or if it's a child */}
                  {(!isParent || server.isChild) && (
                    <ServerCard
                      server={server}
                      darkMode={darkMode}
                      onSelect={(server) => {
                        if (isSelectionMode) {
                          toggleServerSelection(server.id);
                        } else {
                          setSelectedServerForDetails(server);
                        }
                      }}
                      getStatusIcon={getStatusIcon}
                      getServerTypeIcon={getServerTypeIcon}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedServerIds.has(server.id)}
                      onToggleSelection={() => toggleServerSelection(server.id)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-6">
          {/* On-Premise Servers Group */}
          {groupedServers.onPremise.length > 0 && (
            <div>
              <div className={`mb-4 p-3 rounded-lg border ${
                darkMode
                  ? 'bg-gradient-to-r from-orange-900/30 to-yellow-900/30 border-orange-700/50'
                  : 'bg-gradient-to-r from-orange-50/50 to-yellow-50/50 border-orange-200/50'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">🏢</div>
                  <div>
                    <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      On-Premise Servers
                    </h3>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {groupedServers.onPremise.length} {groupedServers.onPremise.length === 1 ? 'server' : 'servers'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {groupedServers.onPremise.map((server: ManagedServer) => (
                  <ServerCard
                    key={server.id}
                    server={server}
                    darkMode={darkMode}
                    onSelect={(server) => {
                      if (isSelectionMode) {
                        toggleServerSelection(server.id);
                      } else {
                        setSelectedServerForDetails(server);
                      }
                    }}
                    getStatusIcon={getStatusIcon}
                    getServerTypeIcon={getServerTypeIcon}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedServerIds.has(server.id)}
                    onToggleSelection={() => toggleServerSelection(server.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Remote Servers Group */}
          {groupedServers.remote.length > 0 && (
            <div>
              <div className={`mb-4 p-3 rounded-lg border ${
                darkMode
                  ? 'bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-700/50'
                  : 'bg-gradient-to-r from-blue-50/50 to-purple-50/50 border-blue-200/50'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">🌐</div>
                  <div>
                    <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Remote Servers
                    </h3>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {groupedServers.remote.length} {groupedServers.remote.length === 1 ? 'server' : 'servers'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {groupedServers.remote.map((server: ManagedServer) => (
                  <ServerCard
                    key={server.id}
                    server={server}
                    darkMode={darkMode}
                    onSelect={(server) => {
                      if (isSelectionMode) {
                        toggleServerSelection(server.id);
                      } else {
                        setSelectedServerForDetails(server);
                      }
                    }}
                    getStatusIcon={getStatusIcon}
                    getServerTypeIcon={getServerTypeIcon}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedServerIds.has(server.id)}
                    onToggleSelection={() => toggleServerSelection(server.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* Server Details Modal */}
      {selectedServerForDetails && (
        <ServerDetailsModal
          server={selectedServerForDetails}
          darkMode={darkMode}
          onClose={() => setSelectedServerForDetails(null)}
          onUpdate={(updatedServer) => {
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