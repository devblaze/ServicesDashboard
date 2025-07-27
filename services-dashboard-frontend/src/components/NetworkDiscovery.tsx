import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Search, Network, Globe, Clock, Server, Shield, AlertCircle } from 'lucide-react';
import { networkDiscoveryApi } from '../services/networkDiscoveryApi';
import type {DiscoveredService} from '../types/networkDiscovery';

interface NetworkDiscoveryProps {
  darkMode?: boolean;
}

export const NetworkDiscovery: React.FC<NetworkDiscoveryProps> = ({ darkMode = false }) => {
  const [networkRange, setNetworkRange] = useState('192.168.4.0/24');
  const [hostAddress, setHostAddress] = useState('');
  const [customPorts, setCustomPorts] = useState('');
  const [scanType, setScanType] = useState<'network' | 'host'>('network');
  const [discoveredServices, setDiscoveredServices] = useState<DiscoveredService[]>([]);

  // Get common ports
  const { data: commonPorts = [] } = useQuery({
    queryKey: ['common-ports'],
    queryFn: networkDiscoveryApi.getCommonPorts
  });

  // Network scan mutation
  const networkScanMutation = useMutation({
    mutationFn: networkDiscoveryApi.scanNetwork,
    onSuccess: (data) => {
      setDiscoveredServices(data);
    },
    onError: (error) => {
      console.error('Network scan failed:', error);
    }
  });

  // Host scan mutation
  const hostScanMutation = useMutation({
    mutationFn: networkDiscoveryApi.scanHost,
    onSuccess: (data) => {
      setDiscoveredServices(data);
    },
    onError: (error) => {
      console.error('Host scan failed:', error);
    }
  });

  const handleScan = () => {
    const ports = customPorts 
      ? customPorts.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p))
      : undefined;

    if (scanType === 'network') {
      networkScanMutation.mutate({ networkRange, ports });
    } else {
      hostScanMutation.mutate({ hostAddress, ports });
    }
  };

  const isScanning = networkScanMutation.isPending || hostScanMutation.isPending;

  const formatResponseTime = (responseTime: string) => {
    try {
      // Parse TimeSpan format (e.g., "00:00:00.123")
      const parts = responseTime.split(':');
      if (parts.length === 3) {
        const seconds = parseFloat(parts[2]);
        return `${(seconds * 1000).toFixed(0)}ms`;
      }
      return responseTime;
    } catch {
      return responseTime;
    }
  };

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType.toLowerCase()) {
      case 'http':
      case 'https':
        return <Globe className="w-4 h-4" />;
      case 'ssh':
        return <Shield className="w-4 h-4" />;
      case 'mysql':
      case 'postgresql':
      case 'sql server':
        return <Server className="w-4 h-4" />;
      default:
        return <Network className="w-4 h-4" />;
    }
  };

  return (
    <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="mb-6">
        <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Network Discovery
        </h2>
        
        {/* Scan Type Selection */}
        <div className="mb-4">
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="network"
                checked={scanType === 'network'}
                onChange={(e) => setScanType(e.target.value as 'network')}
                className="mr-2"
              />
              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Network Range</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="host"
                checked={scanType === 'host'}
                onChange={(e) => setScanType(e.target.value as 'host')}
                className="mr-2"
              />
              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Single Host</span>
            </label>
          </div>
        </div>

        {/* Input Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {scanType === 'network' ? (
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Network Range (CIDR)
              </label>
              <input
                type="text"
                value={networkRange}
                onChange={(e) => setNetworkRange(e.target.value)}
                placeholder="192.168.4.0/24"
                className={`w-full px-3 py-2 border rounded-md ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
          ) : (
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Host Address
              </label>
              <input
                type="text"
                value={hostAddress}
                onChange={(e) => setHostAddress(e.target.value)}
                placeholder="192.168.4.1"
                className={`w-full px-3 py-2 border rounded-md ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
          )}
          
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Custom Ports (comma-separated)
            </label>
            <input
              type="text"
              value={customPorts}
              onChange={(e) => setCustomPorts(e.target.value)}
              placeholder={`Default: ${commonPorts.slice(0, 5).join(', ')}...`}
              className={`w-full px-3 py-2 border rounded-md ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleScan}
              disabled={isScanning || (scanType === 'network' ? !networkRange : !hostAddress)}
              className={`w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
                isScanning ? 'animate-pulse' : ''
              }`}
            >
              {isScanning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Scan
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {(networkScanMutation.error || hostScanMutation.error) && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
              <span className="text-red-700">
                {(networkScanMutation.error || hostScanMutation.error)?.message}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {discoveredServices.length > 0 && (
        <div>
          <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Discovered Services ({discoveredServices.length})
          </h3>
          
          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Service
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Host
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Port
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Response Time
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Banner
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                {discoveredServices.map((service, index) => (
                  <tr key={index} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        {getServiceIcon(service.serviceType)}
                        <span className={`ml-2 text-sm font-medium ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {service.serviceType}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <div>{service.hostAddress}</div>
                        {service.hostName !== service.hostAddress && (
                          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {service.hostName}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {service.port}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1 text-gray-400" />
                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {formatResponseTime(service.responseTime)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`text-sm max-w-xs truncate ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {service.banner || '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
