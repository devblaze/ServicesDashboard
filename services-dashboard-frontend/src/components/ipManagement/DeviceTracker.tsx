import React, { useState, useEffect } from 'react';
import { Server, Search, Filter, RefreshCw, Container, Network, Edit2, Check, X, AlertTriangle, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { ipManagementApi } from '../../services/ipManagementApi';
import { serverManagementApi, type IpConflictCheckResult } from '../../services/serverManagementApi';
import type { NetworkDevice, DeviceStatus, DiscoverySource } from '../../types/IpManagement';
import { getDeviceTypeIcon, getDeviceStatusColor } from '../../types/IpManagement';

interface DeviceTrackerProps {
  darkMode?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

const DeviceTracker: React.FC<DeviceTrackerProps> = ({ darkMode = true }) => {
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<DeviceStatus | 'All'>('All');
  const [filterSource, setFilterSource] = useState<DiscoverySource | 'All'>('All');

  // Sorting state
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Inline editing state
  const [editingDeviceId, setEditingDeviceId] = useState<number | null>(null);
  const [editedIp, setEditedIp] = useState('');
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [conflictResult, setConflictResult] = useState<IpConflictCheckResult | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const data = await ipManagementApi.getAllDevices();
      setDevices(data);
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAllServers = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      const result = await serverManagementApi.syncAllServers();

      if (result.success) {
        const successMessage = `✅ Successfully synced ${result.successfulServers}/${result.totalServers} servers!\n` +
          `Total devices synced: ${result.totalDevicesSynced}\n` +
          `${result.serverResults.filter(r => r.success).map(r => `• ${r.serverName}: ${r.devicesSynced} devices`).join('\n')}`;
        setSyncResult(successMessage);

        // Refresh the devices list after successful sync
        await loadDevices();
      } else {
        const errorMessage = `⚠️ Sync completed with errors:\n` +
          `Success: ${result.successfulServers}/${result.totalServers} servers\n` +
          `${result.serverResults.filter(r => !r.success).map(r => `• ${r.serverName}: ${r.errorMessage}`).join('\n')}`;
        setSyncResult(errorMessage);
      }

      setTimeout(() => setSyncResult(null), 10000);
    } catch (error: any) {
      const errorMsg = `❌ Sync failed: ${error.message || 'Unknown error'}`;
      setSyncResult(errorMsg);
      setTimeout(() => setSyncResult(null), 5000);
    } finally {
      setSyncing(false);
    }
  };

  const handleEditIp = (device: NetworkDevice) => {
    setEditingDeviceId(device.id);
    setEditedIp(device.ipAddress);
    setConflictResult(null);
  };

  const handleCancelEdit = () => {
    setEditingDeviceId(null);
    setEditedIp('');
    setConflictResult(null);
  };

  const handleCheckConflict = async (ipAddress: string, excludeDeviceId: number) => {
    if (!ipAddress || ipAddress === devices.find(d => d.id === excludeDeviceId)?.ipAddress) {
      setConflictResult(null);
      return;
    }

    try {
      setCheckingConflict(true);
      const result = await serverManagementApi.checkIpConflict(ipAddress, excludeDeviceId);
      setConflictResult(result);
    } catch (error) {
      console.error('Failed to check IP conflict:', error);
    } finally {
      setCheckingConflict(false);
    }
  };

  const handleSaveIp = async (device: NetworkDevice) => {
    if (!editedIp || editedIp === device.ipAddress) {
      handleCancelEdit();
      return;
    }

    // Check for conflicts one final time before saving
    if (conflictResult?.hasConflict) {
      // User is trying to save despite conflicts - show confirmation would go here
      // For now, we'll block it
      return;
    }

    try {
      setSaving(true);
      await ipManagementApi.updateDevice(device.id, {
        ...device,
        ipAddress: editedIp
      });

      // Update local state
      setDevices(prevDevices =>
        prevDevices.map(d =>
          d.id === device.id ? { ...d, ipAddress: editedIp } : d
        )
      );

      handleCancelEdit();
    } catch (error: any) {
      alert(`Failed to update IP: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleSort = () => {
    if (sortDirection === null) {
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortDirection(null);
    }
  };

  // Convert IP address to numerical value for proper sorting
  const ipToNumber = (ip: string): number => {
    try {
      const parts = ip.split('.').map(part => parseInt(part, 10));
      if (parts.length !== 4 || parts.some(isNaN)) {
        return 0; // Invalid IP, sort to beginning
      }
      return (parts[0] * 16777216) + (parts[1] * 65536) + (parts[2] * 256) + parts[3];
    } catch {
      return 0;
    }
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch =
      device.hostname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.ipAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.macAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.vendor?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'All' || device.status === filterStatus;
    const matchesSource = filterSource === 'All' || device.source === filterSource;

    return matchesSearch && matchesStatus && matchesSource;
  });

  // Apply sorting to filtered devices
  const sortedDevices = sortDirection
    ? [...filteredDevices].sort((a, b) => {
        const aNum = ipToNumber(a.ipAddress);
        const bNum = ipToNumber(b.ipAddress);
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      })
    : filteredDevices;

  const getSourceBadge = (source: DiscoverySource) => {
    const colors = {
      Docker: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      NetworkScan: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
      OmadaController: 'bg-green-500/20 text-green-400 border-green-500/50',
      ManualEntry: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
      SNMP: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      ArpTable: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    };

    const icons = {
      Docker: '🐳',
      NetworkScan: '🔍',
      OmadaController: '📡',
      ManualEntry: '✏️',
      SNMP: '📊',
      ArpTable: '🔗',
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${colors[source]}`}>
        <span className="mr-1">{icons[source]}</span>
        {source}
      </span>
    );
  };

  const formatLastSeen = (lastSeen: string) => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div>
      {/* Sync Result Notification */}
      {syncResult && (
        <div className={`mb-4 p-4 rounded-lg ${
          syncResult.startsWith('✅')
            ? darkMode
              ? 'bg-green-900/30 border border-green-700/50 text-green-300'
              : 'bg-green-50 border border-green-200 text-green-800'
            : darkMode
              ? 'bg-red-900/30 border border-red-700/50 text-red-300'
              : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <pre className="text-sm whitespace-pre-wrap font-mono">{syncResult}</pre>
        </div>
      )}

      {/* Header with actions */}
      <div className={`rounded-lg p-4 mb-4 ${
        darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Server className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Fixed IP Addresses
            </h3>
            <span className={`px-2 py-0.5 rounded text-xs ${
              darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}>
              {sortedDevices.length} of {devices.length}
              {sortDirection && (
                <span className="ml-1 text-xs opacity-75">
                  • Sorted {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSyncAllServers}
              disabled={syncing}
              className={`flex items-center space-x-2 px-4 py-2 rounded ${
                darkMode
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Sync Fixed IPs from all servers (Docker, VMs, Network Interfaces)"
            >
              <Network className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing All...' : 'Sync All Servers'}</span>
            </button>
            <button
              onClick={loadDevices}
              disabled={loading}
              className={`flex items-center space-x-2 px-4 py-2 rounded ${
                darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              } disabled:opacity-50`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className={`absolute left-3 top-2.5 w-4 h-4 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              placeholder="Search devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 rounded border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className={`absolute left-3 top-2.5 w-4 h-4 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as DeviceStatus | 'All')}
              className={`w-full pl-9 pr-3 py-2 rounded border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="All">All Statuses</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>

          {/* Source Filter */}
          <div className="relative">
            <Container className={`absolute left-3 top-2.5 w-4 h-4 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as DiscoverySource | 'All')}
              className={`w-full pl-9 pr-3 py-2 rounded border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="All">All Sources</option>
              <option value="Docker">🐳 Docker</option>
              <option value="NetworkScan">🔍 Network Scan</option>
              <option value="OmadaController">📡 Omada</option>
              <option value="ManualEntry">✏️ Manual</option>
              <option value="SNMP">📊 SNMP</option>
              <option value="ArpTable">🔗 ARP</option>
            </select>
          </div>
        </div>
      </div>

      {/* Device Table */}
      <div className={`rounded-lg overflow-hidden border ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className={`w-8 h-8 mx-auto mb-4 animate-spin ${
              darkMode ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Loading devices...
            </p>
          </div>
        ) : sortedDevices.length === 0 ? (
          <div className="p-12 text-center">
            <Server className={`w-16 h-16 mx-auto mb-4 ${
              darkMode ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              No fixed IPs found. Sync Docker containers from Server Management → Docker tab
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Device
                  </th>
                  <th
                    className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none ${
                      darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={toggleSort}
                    title="Click to sort"
                  >
                    <div className="flex items-center space-x-1">
                      <span>IP Address</span>
                      {sortDirection === 'asc' && <ChevronUp className="w-4 h-4" />}
                      {sortDirection === 'desc' && <ChevronDown className="w-4 h-4" />}
                    </div>
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    MAC Address
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Status
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Source
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Last Seen
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {sortedDevices.map((device) => (
                  <tr
                    key={device.id}
                    className={`group ${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getDeviceTypeIcon(device.deviceType)}</span>
                        <div>
                          <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {device.hostname || 'Unknown'}
                          </div>
                          {device.vendor && (
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {device.vendor}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {editingDeviceId === device.id ? (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editedIp}
                              onChange={(e) => {
                                setEditedIp(e.target.value);
                                // Debounce conflict check
                                const timeoutId = setTimeout(() => {
                                  handleCheckConflict(e.target.value, device.id);
                                }, 500);
                                return () => clearTimeout(timeoutId);
                              }}
                              onBlur={() => handleCheckConflict(editedIp, device.id)}
                              className={`font-mono text-sm px-2 py-1 rounded border ${
                                conflictResult?.hasConflict
                                  ? darkMode
                                    ? 'border-red-500 bg-red-900/20 text-white'
                                    : 'border-red-500 bg-red-50 text-gray-900'
                                  : darkMode
                                    ? 'border-gray-600 bg-gray-700 text-white'
                                    : 'border-gray-300 bg-white text-gray-900'
                              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                              placeholder="192.168.1.1"
                              autoFocus
                            />
                            {checkingConflict && (
                              <Loader2 className={`w-4 h-4 animate-spin ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                            )}
                            <button
                              onClick={() => handleSaveIp(device)}
                              disabled={saving || checkingConflict || conflictResult?.hasConflict}
                              className={`p-1 rounded ${
                                saving || checkingConflict || conflictResult?.hasConflict
                                  ? 'opacity-50 cursor-not-allowed'
                                  : darkMode
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-green-500 hover:bg-green-600 text-white'
                              }`}
                              title="Save"
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={saving}
                              className={`p-1 rounded ${
                                darkMode
                                  ? 'bg-gray-600 hover:bg-gray-700 text-white'
                                  : 'bg-gray-400 hover:bg-gray-500 text-white'
                              }`}
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {conflictResult?.hasConflict && (
                            <div className={`text-xs p-2 rounded ${
                              darkMode
                                ? 'bg-red-900/30 border border-red-700/50 text-red-300'
                                : 'bg-red-50 border border-red-200 text-red-800'
                            }`}>
                              <div className="flex items-start space-x-1 mb-1">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                <span className="font-semibold">IP Conflict Detected:</span>
                              </div>
                              {conflictResult.conflicts.slice(0, 3).map((conflict, idx) => (
                                <div key={idx} className="ml-4 text-xs">
                                  • {conflict.source}: {conflict.deviceName}
                                  {conflict.serverName && ` on ${conflict.serverName}`}
                                  {' '}({conflict.status})
                                </div>
                              ))}
                              {conflictResult.conflicts.length > 3 && (
                                <div className="ml-4 text-xs mt-1">
                                  +{conflictResult.conflicts.length - 3} more conflicts
                                </div>
                              )}
                            </div>
                          )}
                          {conflictResult && !conflictResult.hasConflict && (
                            <div className={`text-xs p-2 rounded ${
                              darkMode
                                ? 'bg-green-900/30 border border-green-700/50 text-green-300'
                                : 'bg-green-50 border border-green-200 text-green-800'
                            }`}>
                              ✓ IP is available
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <div>
                            <div className={`font-mono text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {device.ipAddress}
                            </div>
                            {device.isStaticIp && (
                              <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs ${
                                darkMode
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                Static
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleEditIp(device)}
                            className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                              darkMode
                                ? 'hover:bg-gray-600 text-gray-400 hover:text-white'
                                : 'hover:bg-gray-200 text-gray-500 hover:text-gray-900'
                            }`}
                            title="Edit IP Address"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className={`font-mono text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {device.macAddress || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        getDeviceStatusColor(device.status)
                      }`}>
                        <span className={`w-2 h-2 mr-1.5 rounded-full ${
                          device.status === 'Online' ? 'bg-green-400' :
                          device.status === 'Offline' ? 'bg-red-400' :
                          'bg-gray-400'
                        }`} />
                        {device.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {getSourceBadge(device.source)}
                    </td>
                    <td className="px-4 py-3">
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {formatLastSeen(device.lastSeen)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceTracker;
