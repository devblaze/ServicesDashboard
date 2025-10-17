import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { ipManagementApi } from '../../services/ipManagementApi';
import type { Subnet, NetworkDevice } from '../../types/IpManagement';

interface IpOverviewProps {
  darkMode?: boolean;
}

type FilterStatus = 'all' | 'taken' | 'available';

interface IpAddressEntry {
  ip: string;
  status: 'taken' | 'available' | 'gateway' | 'reserved';
  subnet: Subnet;
  device?: NetworkDevice;
  hostname?: string;
  macAddress?: string;
  deviceType?: string;
  notes?: string;
}

const IpOverview: React.FC<IpOverviewProps> = ({ darkMode = true }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedSubnet, setSelectedSubnet] = useState<number | 'all'>('all');

  // Fetch all subnets
  const { data: subnets = [], isLoading: subnetsLoading } = useQuery({
    queryKey: ['ip-subnets'],
    queryFn: () => ipManagementApi.getAllSubnets(),
  });

  // Fetch all devices
  const { data: devices = [], isLoading: devicesLoading, refetch: refetchDevices } = useQuery({
    queryKey: ['all-devices'],
    queryFn: () => ipManagementApi.getAllDevices(),
  });

  // Fetch all reservations
  const { data: reservations = [], isLoading: reservationsLoading } = useQuery({
    queryKey: ['all-reservations'],
    queryFn: () => ipManagementApi.getAllReservations(),
  });

  const isLoading = subnetsLoading || devicesLoading || reservationsLoading;

  // Helper function to parse CIDR and generate all IPs
  const generateIpsForSubnet = (subnet: Subnet): string[] => {
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
  };

  // Build comprehensive IP list
  const allIpAddresses = useMemo((): IpAddressEntry[] => {
    const entries: IpAddressEntry[] = [];

    // Filter subnets based on selection
    const subnetsToProcess = selectedSubnet === 'all'
      ? subnets
      : subnets.filter(s => s.id === selectedSubnet);

    subnetsToProcess.forEach(subnet => {
      const ips = generateIpsForSubnet(subnet);

      ips.forEach(ip => {
        const device = devices.find(d => d.ipAddress === ip);
        const reservation = reservations.find(r => r.ipAddress === ip && r.isActive);

        let status: IpAddressEntry['status'];
        if (ip === subnet.gateway) {
          status = 'gateway';
        } else if (device) {
          status = 'taken';
        } else if (reservation) {
          status = 'reserved';
        } else {
          status = 'available';
        }

        entries.push({
          ip,
          status,
          subnet,
          device,
          hostname: device?.hostname,
          macAddress: device?.macAddress,
          deviceType: device?.deviceType,
          notes: device?.notes
        });
      });
    });

    return entries.sort((a, b) => {
      // Sort by subnet first, then by IP
      if (a.subnet.id !== b.subnet.id) {
        return a.subnet.network.localeCompare(b.subnet.network);
      }
      // Simple IP sort
      const aOctets = a.ip.split('.').map(Number);
      const bOctets = b.ip.split('.').map(Number);
      for (let i = 0; i < 4; i++) {
        if (aOctets[i] !== bOctets[i]) {
          return aOctets[i] - bOctets[i];
        }
      }
      return 0;
    });
  }, [subnets, devices, reservations, selectedSubnet]);

  // Filter IPs based on search and status
  const filteredIps = useMemo(() => {
    let filtered = allIpAddresses;

    // Filter by status
    if (filterStatus === 'taken') {
      filtered = filtered.filter(entry =>
        entry.status === 'taken' || entry.status === 'gateway' || entry.status === 'reserved'
      );
    } else if (filterStatus === 'available') {
      filtered = filtered.filter(entry => entry.status === 'available');
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry => {
        return (
          entry.ip.includes(query) ||
          entry.hostname?.toLowerCase().includes(query) ||
          entry.macAddress?.toLowerCase().includes(query) ||
          entry.subnet.network.includes(query) ||
          entry.subnet.description?.toLowerCase().includes(query) ||
          entry.deviceType?.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  }, [allIpAddresses, filterStatus, searchQuery]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = allIpAddresses.length;
    const taken = allIpAddresses.filter(e => e.status === 'taken').length;
    const available = allIpAddresses.filter(e => e.status === 'available').length;
    const reserved = allIpAddresses.filter(e => e.status === 'reserved').length;
    const gateway = allIpAddresses.filter(e => e.status === 'gateway').length;
    const usagePercentage = total > 0 ? ((taken + reserved + gateway) / total) * 100 : 0;

    return { total, taken, available, reserved, gateway, usagePercentage };
  }, [allIpAddresses]);

  const getStatusIcon = (status: IpAddressEntry['status']) => {
    switch (status) {
      case 'taken':
        return <XCircle className="w-4 h-4 text-blue-500" />;
      case 'available':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'reserved':
        return <AlertCircle className="w-4 h-4 text-purple-500" />;
      case 'gateway':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
    }
  };

  const getStatusLabel = (status: IpAddressEntry['status']) => {
    switch (status) {
      case 'taken': return 'In Use';
      case 'available': return 'Available';
      case 'reserved': return 'Reserved';
      case 'gateway': return 'Gateway';
    }
  };

  const getStatusColor = (status: IpAddressEntry['status']) => {
    switch (status) {
      case 'taken':
        return darkMode ? 'text-blue-400' : 'text-blue-600';
      case 'available':
        return darkMode ? 'text-green-400' : 'text-green-600';
      case 'reserved':
        return darkMode ? 'text-purple-400' : 'text-purple-600';
      case 'gateway':
        return darkMode ? 'text-orange-400' : 'text-orange-600';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Statistics Header */}
      <div className={`rounded-lg p-6 mb-6 ${
        darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          IP Address Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="text-2xl font-bold text-gray-500">{stats.total}</div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total IPs</div>
          </div>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="text-2xl font-bold text-blue-500">{stats.taken}</div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>In Use</div>
          </div>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="text-2xl font-bold text-green-500">{stats.available}</div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Available</div>
          </div>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="text-2xl font-bold text-purple-500">{stats.reserved}</div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Reserved</div>
          </div>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="text-2xl font-bold text-orange-500">{stats.gateway}</div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Gateway</div>
          </div>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="text-2xl font-bold text-yellow-500">{stats.usagePercentage.toFixed(1)}%</div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Usage</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              placeholder="Search by IP, hostname, MAC, subnet..."
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

        {/* Status Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white'
                : darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Filter className="w-4 h-4 inline mr-2" />
            All
          </button>
          <button
            onClick={() => setFilterStatus('taken')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'taken'
                ? 'bg-blue-600 text-white'
                : darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Taken
          </button>
          <button
            onClick={() => setFilterStatus('available')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === 'available'
                ? 'bg-green-600 text-white'
                : darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Available
          </button>
        </div>

        {/* Subnet Filter */}
        <select
          value={selectedSubnet}
          onChange={(e) => setSelectedSubnet(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
          className={`px-4 py-2 rounded-lg border font-medium ${
            darkMode
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
        >
          <option value="all">All Subnets</option>
          {subnets.map(subnet => (
            <option key={subnet.id} value={subnet.id}>
              {subnet.network} {subnet.description && `- ${subnet.description}`}
            </option>
          ))}
        </select>

        {/* Refresh Button */}
        <button
          onClick={() => refetchDevices()}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            darkMode
              ? 'bg-gray-800 hover:bg-gray-700 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Results Info */}
      <div className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Showing {filteredIps.length} of {allIpAddresses.length} IP addresses
      </div>

      {/* IP Address Table */}
      <div className={`rounded-lg overflow-hidden ${
        darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Status
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  IP Address
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Subnet
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Hostname
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  MAC Address
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Device Type
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredIps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                      No IP addresses match your search criteria
                    </p>
                  </td>
                </tr>
              ) : (
                filteredIps.map((entry) => (
                  <tr
                    key={`${entry.subnet.id}-${entry.ip}`}
                    className={darkMode ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(entry.status)}
                        <span className={`text-sm font-medium ${getStatusColor(entry.status)}`}>
                          {getStatusLabel(entry.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-mono text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {entry.ip}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {entry.subnet.network}
                        </div>
                        {entry.subnet.description && (
                          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {entry.subnet.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {entry.hostname || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-mono text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {entry.macAddress || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {entry.deviceType || '-'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default IpOverview;
