import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Copy, Plus, Shield, RefreshCw, Activity, AlertCircle } from 'lucide-react';
import { ipManagementApi } from '../../services/ipManagementApi';
import type { Subnet, IpGridCell } from '../../types/IpManagement';
import { getDeviceTypeIcon, getDeviceStatusColor } from '../../types/IpManagement';

interface IpGridVisualizationProps {
  subnet: Subnet;
  darkMode?: boolean;
}

const IpGridVisualization: React.FC<IpGridVisualizationProps> = ({ subnet, darkMode = true }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIp, setSelectedIp] = useState<IpGridCell | null>(null);
  const [showOnlyUsed, setShowOnlyUsed] = useState(false);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);

  // Fetch all data for this subnet
  const { data: devices = [], isLoading: devicesLoading } = useQuery({
    queryKey: ['subnet-devices', subnet.id],
    queryFn: () => ipManagementApi.getAllDevices(subnet.id),
  });

  const { data: reservations = [], isLoading: reservationsLoading } = useQuery({
    queryKey: ['subnet-reservations', subnet.id],
    queryFn: () => ipManagementApi.getAllReservations(subnet.id),
  });

  const isLoading = devicesLoading || reservationsLoading;

  // Parse subnet CIDR and generate all IPs
  const allIps = useMemo(() => {
    const [baseIp, prefix] = subnet.network.split('/');
    const prefixLength = parseInt(prefix);
    const hostBits = 32 - prefixLength;
    const hostCount = Math.pow(2, hostBits);

    const ipParts = baseIp.split('.').map(Number);
    const baseInt = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];

    const ips: string[] = [];
    for (let i = 1; i < hostCount - 1; i++) {
      const hostInt = baseInt + i;
      const ip = [
        (hostInt >>> 24) & 0xFF,
        (hostInt >>> 16) & 0xFF,
        (hostInt >>> 8) & 0xFF,
        hostInt & 0xFF
      ].join('.');
      ips.push(ip);
    }

    return ips;
  }, [subnet.network]);

  // Check if IP is in DHCP range
  const isInDhcpRange = useCallback((ip: string): boolean => {
    if (!subnet.dhcpStart || !subnet.dhcpEnd) return false;

    const ipToInt = (ipStr: string) => {
      const parts = ipStr.split('.').map(Number);
      return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
    };

    const ipInt = ipToInt(ip);
    const dhcpStartInt = ipToInt(subnet.dhcpStart);
    const dhcpEndInt = ipToInt(subnet.dhcpEnd);

    return ipInt >= dhcpStartInt && ipInt <= dhcpEndInt;
  }, [subnet.dhcpStart, subnet.dhcpEnd]);

  // Build IP grid with status
  const ipGrid: IpGridCell[] = useMemo(() => {
    return allIps.map(ip => {
      const device = devices.find(d => d.ipAddress === ip);
      const reservation = reservations.find(r => r.ipAddress === ip && r.isActive);

      let status: IpGridCell['status'];
      if (ip === subnet.gateway) {
        status = 'gateway';
      } else if (device) {
        status = 'used';
      } else if (reservation) {
        status = 'reserved';
      } else if (isInDhcpRange(ip)) {
        status = 'dhcp';
      } else {
        status = 'available';
      }

      return { ip, status, device, reservation };
    });
  }, [allIps, devices, reservations, subnet.gateway, isInDhcpRange]);

  // Filter IPs based on search and filters
  const filteredIpGrid = useMemo(() => {
    let filtered = ipGrid;

    if (showOnlyUsed) {
      filtered = filtered.filter(cell => cell.status === 'used' || cell.status === 'gateway');
    }

    if (showOnlyAvailable) {
      filtered = filtered.filter(cell => cell.status === 'available');
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(cell => {
        if (cell.ip.includes(query)) return true;
        if (cell.device?.hostname?.toLowerCase().includes(query)) return true;
        if (cell.device?.macAddress?.toLowerCase().includes(query)) return true;
        if (cell.reservation?.description.toLowerCase().includes(query)) return true;
        return false;
      });
    }

    return filtered;
  }, [ipGrid, searchQuery, showOnlyUsed, showOnlyAvailable]);

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    // Could add a toast notification here
  };

  const getStatusColor = (status: IpGridCell['status']): string => {
    switch (status) {
      case 'available':
        return darkMode
          ? 'bg-green-900/30 border-green-700 hover:bg-green-900/50'
          : 'bg-green-50 border-green-200 hover:bg-green-100';
      case 'used':
        return darkMode
          ? 'bg-blue-900/30 border-blue-700 hover:bg-blue-900/50'
          : 'bg-blue-50 border-blue-200 hover:bg-blue-100';
      case 'reserved':
        return darkMode
          ? 'bg-purple-900/30 border-purple-700 hover:bg-purple-900/50'
          : 'bg-purple-50 border-purple-200 hover:bg-purple-100';
      case 'dhcp':
        return darkMode
          ? 'bg-yellow-900/30 border-yellow-700 hover:bg-yellow-900/50'
          : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100';
      case 'gateway':
        return darkMode
          ? 'bg-orange-900/30 border-orange-700 hover:bg-orange-900/50'
          : 'bg-orange-50 border-orange-200 hover:bg-orange-100';
      default:
        return darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusLabel = (status: IpGridCell['status']): string => {
    switch (status) {
      case 'available': return 'Available';
      case 'used': return 'In Use';
      case 'reserved': return 'Reserved';
      case 'dhcp': return 'DHCP Pool';
      case 'gateway': return 'Gateway';
      default: return 'Unknown';
    }
  };

  const stats = useMemo(() => {
    const available = ipGrid.filter(c => c.status === 'available').length;
    const used = ipGrid.filter(c => c.status === 'used').length;
    const reserved = ipGrid.filter(c => c.status === 'reserved').length;
    const dhcp = ipGrid.filter(c => c.status === 'dhcp').length;
    const gateway = ipGrid.filter(c => c.status === 'gateway').length;
    const onlineDevices = devices.filter(d => d.status === 'Online').length;

    return { available, used, reserved, dhcp, gateway, onlineDevices };
  }, [ipGrid, devices]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Header with Stats */}
      <div className={`rounded-lg p-6 mb-6 ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {subnet.network}
            </h2>
            {subnet.description && (
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                {subnet.description}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Activity className={`w-5 h-5 ${stats.onlineDevices > 0 ? 'text-green-500' : 'text-gray-400'}`} />
            <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
              {stats.onlineDevices} Online
            </span>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="text-2xl font-bold text-green-500">{stats.available}</div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Available</div>
          </div>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="text-2xl font-bold text-blue-500">{stats.used}</div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>In Use</div>
          </div>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="text-2xl font-bold text-purple-500">{stats.reserved}</div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Reserved</div>
          </div>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="text-2xl font-bold text-yellow-500">{stats.dhcp}</div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>DHCP Pool</div>
          </div>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="text-2xl font-bold text-orange-500">{stats.gateway}</div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Gateway</div>
          </div>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="text-2xl font-bold text-gray-500">{allIps.length}</div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total IPs</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              placeholder="Search by IP, hostname, MAC address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowOnlyUsed(!showOnlyUsed)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              showOnlyUsed
                ? 'bg-blue-600 text-white'
                : darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Used Only
          </button>
          <button
            onClick={() => setShowOnlyAvailable(!showOnlyAvailable)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              showOnlyAvailable
                ? 'bg-green-600 text-white'
                : darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Available Only
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className={`flex flex-wrap gap-4 mb-6 p-4 rounded-lg ${
        darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-gray-50 border border-gray-200'
      }`}>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded border-2 bg-green-900/30 border-green-700"></div>
          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Available</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded border-2 bg-blue-900/30 border-blue-700"></div>
          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>In Use</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded border-2 bg-purple-900/30 border-purple-700"></div>
          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Reserved</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded border-2 bg-yellow-900/30 border-yellow-700"></div>
          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>DHCP Pool</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded border-2 bg-orange-900/30 border-orange-700"></div>
          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Gateway</span>
        </div>
      </div>

      {/* IP Grid */}
      <div className={`rounded-lg p-6 ${darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        {filteredIpGrid.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              No IPs match your search criteria
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
            {filteredIpGrid.map(cell => (
              <div
                key={cell.ip}
                className={`
                  relative p-2 rounded border-2 cursor-pointer transition-all
                  ${getStatusColor(cell.status)}
                  group
                `}
                onClick={() => setSelectedIp(cell)}
                title={`${cell.ip} - ${getStatusLabel(cell.status)}`}
              >
                {/* IP Address */}
                <div className={`text-xs font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {cell.ip.split('.').pop()}
                </div>

                {/* Status Indicator */}
                {cell.device && (
                  <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                    cell.device.status === 'Online' ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                )}

                {/* Hover Tooltip */}
                <div className={`
                  absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
                  p-3 rounded-lg shadow-lg z-10 w-64
                  opacity-0 group-hover:opacity-100 pointer-events-none
                  transition-opacity duration-200
                  ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}
                `}>
                  <div className={`text-sm font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {cell.ip}
                  </div>
                  <div className={`text-xs space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <div>Status: <span className="font-semibold">{getStatusLabel(cell.status)}</span></div>
                    {cell.device && (
                      <>
                        <div>Hostname: {cell.device.hostname || 'N/A'}</div>
                        <div>MAC: {cell.device.macAddress || 'N/A'}</div>
                        <div>Type: {getDeviceTypeIcon(cell.device.deviceType)} {cell.device.deviceType}</div>
                        <div className={getDeviceStatusColor(cell.device.status)}>
                          ● {cell.device.status}
                        </div>
                      </>
                    )}
                    {cell.reservation && (
                      <>
                        <div>Reserved for: {cell.reservation.description}</div>
                        {cell.reservation.assignedTo && (
                          <div>Assigned to: {cell.reservation.assignedTo}</div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected IP Details Panel */}
      {selectedIp && (
        <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4`}
          onClick={() => setSelectedIp(null)}
        >
          <div
            className={`max-w-2xl w-full rounded-lg p-6 ${
              darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {selectedIp.ip}
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {getStatusLabel(selectedIp.status)}
                </p>
              </div>
              <button
                onClick={() => handleCopyIp(selectedIp.ip)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
                title="Copy IP"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>

            {selectedIp.device ? (
              <div className="space-y-4">
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Device Information</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Hostname:</span>
                    <span className={darkMode ? 'text-white' : 'text-gray-900'}>{selectedIp.device.hostname || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>MAC Address:</span>
                    <span className={`font-mono ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedIp.device.macAddress || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Type:</span>
                    <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                      {getDeviceTypeIcon(selectedIp.device.deviceType)} {selectedIp.device.deviceType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Status:</span>
                    <span className={getDeviceStatusColor(selectedIp.device.status)}>
                      ● {selectedIp.device.status}
                    </span>
                  </div>
                  {selectedIp.device.vendor && (
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Vendor:</span>
                      <span className={darkMode ? 'text-white' : 'text-gray-900'}>{selectedIp.device.vendor}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>First Seen:</span>
                    <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                      {new Date(selectedIp.device.firstSeen).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Last Seen:</span>
                    <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                      {new Date(selectedIp.device.lastSeen).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : selectedIp.reservation ? (
              <div className="space-y-4">
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Reservation Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Description:</span>
                    <span className={darkMode ? 'text-white' : 'text-gray-900'}>{selectedIp.reservation.description}</span>
                  </div>
                  {selectedIp.reservation.assignedTo && (
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Assigned To:</span>
                      <span className={darkMode ? 'text-white' : 'text-gray-900'}>{selectedIp.reservation.assignedTo}</span>
                    </div>
                  )}
                  {selectedIp.reservation.macAddress && (
                    <div className="flex justify-between">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>MAC Address:</span>
                      <span className={`font-mono ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {selectedIp.reservation.macAddress}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  This IP address is currently {getStatusLabel(selectedIp.status).toLowerCase()}.
                </p>
                <div className="flex space-x-3">
                  <button
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Device
                  </button>
                  <button
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Reserve IP
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedIp(null)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IpGridVisualization;
