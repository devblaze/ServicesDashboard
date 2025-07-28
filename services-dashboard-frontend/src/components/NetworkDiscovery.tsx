import React, { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Network, 
  Globe, 
  Server, 
  Shield, 
  AlertCircle, 
  Plus, 
  Loader2,
  Wifi,
  Target,
  Activity,
  CheckCircle2,
  Eye,
  Zap,
  Filter,
  X
} from 'lucide-react';
import { networkDiscoveryApi } from '../services/networkDiscoveryApi';
import type { DiscoveredService } from '../types/networkDiscovery';

interface NetworkDiscoveryProps {
  darkMode?: boolean;
}

export const NetworkDiscovery: React.FC<NetworkDiscoveryProps> = ({ darkMode = true }) => {
  const [networkRange, setNetworkRange] = useState('192.168.4.0/24');
  const [hostAddress, setHostAddress] = useState('');
  const [customPorts, setCustomPorts] = useState('');
  const [scanType, setScanType] = useState<'network' | 'host'>('network');
  const [discoveredServices, setDiscoveredServices] = useState<DiscoveredService[]>([]);
  const [addedServices, setAddedServices] = useState<Set<string>>(new Set());
  
  // Filter states
  const [searchFilter, setSearchFilter] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('');
  const [portFilter, setPortFilter] = useState('');
  const [showOnlyAdded, setShowOnlyAdded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const queryClient = useQueryClient();

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
      setAddedServices(new Set()); // Reset added services when new scan is performed
      // Reset filters when new scan is performed
      setSearchFilter('');
      setServiceTypeFilter('');
      setPortFilter('');
      setShowOnlyAdded(false);
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
      setAddedServices(new Set()); // Reset added services when new scan is performed
      // Reset filters when new scan is performed
      setSearchFilter('');
      setServiceTypeFilter('');
      setPortFilter('');
      setShowOnlyAdded(false);
    },
    onError: (error) => {
      console.error('Host scan failed:', error);
    }
  });

  // Add to services mutation
  const addToServicesMutation = useMutation({
    mutationFn: networkDiscoveryApi.addToServices,
    onSuccess: (data, variables) => {
      console.log('Service added successfully:', data);
      // Mark this service as added
      const serviceKey = `${variables.hostAddress}:${variables.port}`;
      setAddedServices(prev => new Set([...prev, serviceKey]));
      
      // Invalidate services query to refresh the services list
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
    onError: (error) => {
      console.error('Failed to add service:', error);
    }
  });

  // Get unique service types for filter dropdown
  const uniqueServiceTypes = useMemo(() => {
    const types = discoveredServices.map(service => service.serviceType);
    return [...new Set(types)].sort();
  }, [discoveredServices]);

  // Get unique ports for filter dropdown
  const uniquePorts = useMemo(() => {
    const ports = discoveredServices.map(service => service.port.toString());
    return [...new Set(ports)].sort((a, b) => parseInt(a) - parseInt(b));
  }, [discoveredServices]);

  // Filter services based on current filters
  const filteredServices = useMemo(() => {
    return discoveredServices.filter(service => {
      const serviceKey = `${service.hostAddress}:${service.port}`;
      
      // Search filter (matches host address, service type, or banner)
      if (searchFilter) {
        const searchLower = searchFilter.toLowerCase();
        const matchesSearch = 
          service.hostAddress.toLowerCase().includes(searchLower) ||
          service.serviceType.toLowerCase().includes(searchLower) ||
          (service.banner && service.banner.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }

      // Service type filter
      if (serviceTypeFilter && service.serviceType !== serviceTypeFilter) {
        return false;
      }

      // Port filter
      if (portFilter && service.port.toString() !== portFilter) {
        return false;
      }

      // Show only added filter
      if (showOnlyAdded && !addedServices.has(serviceKey)) {
        return false;
      }

      return true;
    });
  }, [discoveredServices, searchFilter, serviceTypeFilter, portFilter, showOnlyAdded, addedServices]);

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

  const handleAddToServices = (service: DiscoveredService) => {
    const serviceName = service.banner 
      ? `${service.serviceType} - ${service.banner}`.substring(0, 50)
      : `${service.serviceType} on ${service.hostAddress}`;

    addToServicesMutation.mutate({
      name: serviceName,
      description: `Discovered ${service.serviceType} service on ${service.hostAddress}:${service.port}${service.banner ? ` - ${service.banner}` : ''}`,
      hostAddress: service.hostAddress,
      port: service.port,
      serviceType: service.serviceType,
      banner: service.banner
    });
  };

  const clearAllFilters = () => {
    setSearchFilter('');
    setServiceTypeFilter('');
    setPortFilter('');
    setShowOnlyAdded(false);
  };

  const isScanning = networkScanMutation.isPending || hostScanMutation.isPending;
  const isServiceAdded = (service: DiscoveredService) => {
    const serviceKey = `${service.hostAddress}:${service.port}`;
    return addedServices.has(serviceKey);
  };

  const formatResponseTime = (responseTime: string | number) => {
    try {
      const responseTimeStr = String(responseTime);
      // Parse TimeSpan format (e.g., "00:00:00.123")
      const parts = responseTimeStr.split(':');
      if (parts.length === 3) {
        const seconds = parseFloat(parts[2]);
        return `${(seconds * 1000).toFixed(0)}ms`;
      }
      // If it's already in milliseconds (number)
      if (typeof responseTime === 'number') {
        return `${responseTime.toFixed(0)}ms`;
      }
      return responseTimeStr;
    } catch {
      return String(responseTime);
    }
  };

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType.toLowerCase()) {
      case 'http':
      case 'https':
      case 'http alt':
      case 'https alt':
        return <Globe className="w-5 h-5" />;
      case 'ssh':
        return <Shield className="w-5 h-5" />;
      case 'mysql':
      case 'postgresql':
      case 'sql server':
      case 'mongodb':
      case 'redis':
      case 'elasticsearch':
        return <Server className="w-5 h-5" />;
      default:
        return <Network className="w-5 h-5" />;
    }
  };

  const getServiceTypeColor = (serviceType: string) => {
    switch (serviceType.toLowerCase()) {
      case 'http':
      case 'https':
      case 'http alt':
      case 'https alt':
        return darkMode ? 'text-green-400 bg-green-900/20 border-green-600/30' : 'text-green-600 bg-green-50 border-green-200';
      case 'ssh':
        return darkMode ? 'text-purple-400 bg-purple-900/20 border-purple-600/30' : 'text-purple-600 bg-purple-50 border-purple-200';
      case 'mysql':
      case 'postgresql':
      case 'sql server':
      case 'mongodb':
      case 'redis':
      case 'elasticsearch':
        return darkMode ? 'text-blue-400 bg-blue-900/20 border-blue-600/30' : 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return darkMode ? 'text-gray-400 bg-gray-800/20 border-gray-600/30' : 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const error = networkScanMutation.error || hostScanMutation.error || addToServicesMutation.error;
  const hasActiveFilters = searchFilter || serviceTypeFilter || portFilter || showOnlyAdded;

  return (
    <div className={`rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
      darkMode 
        ? 'bg-gray-800/50 border-gray-700/50 shadow-lg shadow-gray-900/20' 
        : 'bg-white/80 border-gray-200/50 shadow-lg shadow-gray-200/20'
    }`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center space-x-4 mb-6">
          <div className={`p-3 rounded-xl ${
            darkMode ? 'bg-blue-900/50' : 'bg-blue-100/50'
          }`}>
            <Target className={`w-6 h-6 ${
              darkMode ? 'text-blue-400' : 'text-blue-600'
            }`} />
          </div>
          <div>
            <h2 className={`text-xl font-semibold ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Network Discovery
            </h2>
            <p className={`text-sm ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Scan your network to discover running services
            </p>
          </div>
        </div>
        
        {/* Scan Type Selection */}
        <div className={`inline-flex p-1 rounded-xl mb-6 ${
          darkMode ? 'bg-gray-700/50' : 'bg-gray-100/50'
        }`}>
          <button
            onClick={() => setScanType('network')}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              scanType === 'network'
                ? darkMode
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-blue-500 text-white shadow-lg'
                : darkMode
                  ? 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Wifi className="w-4 h-4 mr-2" />
            Network Range
          </button>
          <button
            onClick={() => setScanType('host')}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              scanType === 'host'
                ? darkMode
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-blue-500 text-white shadow-lg'
                : darkMode
                  ? 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Activity className="w-4 h-4 mr-2" />
            Single Host
          </button>
        </div>

        {/* Input Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scanType === 'network' ? (
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Network Range (CIDR)
              </label>
              <input
                type="text"
                value={networkRange}
                onChange={(e) => setNetworkRange(e.target.value)}
                placeholder="192.168.4.0/24"
                className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  darkMode
                    ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:bg-gray-700'
                    : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-white'
                }`}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Host Address
              </label>
              <input
                type="text"
                value={hostAddress}
                onChange={(e) => setHostAddress(e.target.value)}
                placeholder="192.168.4.1"
                className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  darkMode
                    ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:bg-gray-700'
                    : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-white'
                }`}
              />
            </div>
          )}
          
          <div className="space-y-2">
            <label className={`block text-sm font-medium ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Custom Ports (comma-separated)
            </label>
            <input
              type="text"
              value={customPorts}
              onChange={(e) => setCustomPorts(e.target.value)}
              placeholder={`Default: ${commonPorts.slice(0, 5).join(', ')}...`}
              className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                darkMode
                  ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:bg-gray-700'
                  : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-white'
              }`}
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleScan}
              disabled={isScanning || (scanType === 'network' ? !networkRange : !hostAddress)}
              className={`w-full px-6 py-3 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
                darkMode
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-900/25'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25'
              } hover:scale-105 active:scale-95`}
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Start Scan
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className={`mt-4 p-4 rounded-xl border transition-all duration-300 ${
            darkMode
              ? 'bg-red-900/20 border-red-600/50 text-red-300'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
              <span className="font-medium">{String(error)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {discoveredServices.length > 0 && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                darkMode ? 'bg-green-900/20' : 'bg-green-100'
              }`}>
                <Eye className={`w-5 h-5 ${
                  darkMode ? 'text-green-400' : 'text-green-600'
                }`} />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Discovered Services
                </h3>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {filteredServices.length !== discoveredServices.length ? (
                    <>Showing {filteredServices.length} of {discoveredServices.length} services</>
                  ) : (
                    <>Found {discoveredServices.length} running services</>
                  )}
                </p>
              </div>
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                hasActiveFilters
                  ? darkMode
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : darkMode
                    ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white'
                    : 'bg-gray-100/50 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              } hover:scale-105 active:scale-95`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                  darkMode ? 'bg-blue-400/20 text-blue-300' : 'bg-blue-400/20 text-blue-700'
                }`}>
                  {[searchFilter, serviceTypeFilter, portFilter, showOnlyAdded].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className={`mb-6 p-4 rounded-xl border transition-all duration-300 ${
              darkMode
                ? 'bg-gray-700/30 border-gray-600/30'
                : 'bg-white/50 border-gray-200/50'
            }`}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search Filter */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Search
                  </label>
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Host, service, banner..."
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        darkMode
                          ? 'bg-gray-600/50 border-gray-500 text-white placeholder-gray-400'
                          : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Service Type Filter */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Service Type
                  </label>
                  <select
                    value={serviceTypeFilter}
                    onChange={(e) => setServiceTypeFilter(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      darkMode
                        ? 'bg-gray-600/50 border-gray-500 text-white'
                        : 'bg-white/50 border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">All Types</option>
                    {uniqueServiceTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Port Filter */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Port
                  </label>
                  <select
                    value={portFilter}
                    onChange={(e) => setPortFilter(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      darkMode
                        ? 'bg-gray-600/50 border-gray-500 text-white'
                        : 'bg-white/50 border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">All Ports</option>
                    {uniquePorts.map(port => (
                      <option key={port} value={port}>{port}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Status
                  </label>
                  <div className="flex items-center space-x-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={showOnlyAdded}
                        onChange={(e) => setShowOnlyAdded(e.target.checked)}
                        className={`rounded border-2 focus:ring-2 focus:ring-blue-500 ${
                          darkMode
                            ? 'bg-gray-600 border-gray-500 text-blue-600'
                            : 'bg-white border-gray-300 text-blue-600'
                        }`}
                      />
                      <span className={`ml-2 text-sm ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Only Added
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <div className="mt-4 pt-4 border-t border-gray-600/30">
                  <button
                    onClick={clearAllFilters}
                    className={`flex items-center px-3 py-1.5 text-sm rounded-lg font-medium transition-all duration-200 ${
                      darkMode
                        ? 'text-gray-400 hover:text-white hover:bg-gray-600/50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                    }`}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          )}
          
          <div className="grid gap-4">
            {filteredServices.map((service, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02] ${
                  darkMode
                    ? 'bg-gray-700/30 border-gray-600/30 hover:bg-gray-700/50 hover:border-gray-600/50'
                    : 'bg-white/50 border-gray-200/50 hover:bg-white hover:border-gray-300/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {/* Service Icon & Type */}
                    <div className={`flex items-center space-x-3 px-3 py-2 rounded-lg border ${getServiceTypeColor(service.serviceType)}`}>
                      {getServiceIcon(service.serviceType)}
                      <span className="font-medium text-sm">
                        {service.serviceType}
                      </span>
                    </div>

                    {/* Host Information */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {service.hostAddress}:{service.port}
                        </span>
                      </div>
                      
                      {service.banner && (
                        <p className={`text-sm mt-1 ${
                          darkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {service.banner}
                        </p>
                      )}
                      
                      <div className="flex items-center mt-2 space-x-4">
                        <div className="flex items-center space-x-1">
                          <Zap className={`w-3 h-3 ${
                            darkMode ? 'text-gray-500' : 'text-gray-400'
                          }`} />
                          <span className={`text-xs ${
                            darkMode ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                            {formatResponseTime(service.responseTime)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="ml-4">
                    {isServiceAdded(service) ? (
                      <div className={`flex items-center px-4 py-2 rounded-lg ${
                        darkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-50 text-green-600'
                      }`}>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">Added</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddToServices(service)}
                        disabled={addToServicesMutation.isPending}
                        className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                          darkMode
                            ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg shadow-green-900/25'
                            : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg shadow-green-500/25'
                        } hover:scale-105 active:scale-95`}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        <span className="text-sm">Add Service</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* No Results Message */}
          {filteredServices.length === 0 && discoveredServices.length > 0 && (
            <div className="text-center py-8">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                darkMode ? 'bg-gray-700/30' : 'bg-gray-100'
              }`}>
                <Search className={`w-8 h-8 ${
                  darkMode ? 'text-gray-500' : 'text-gray-400'
                }`} />
              </div>
              <h3 className={`text-lg font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                No Services Match Your Filters
              </h3>
              <p className={`text-sm ${
                darkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
                Try adjusting your search criteria or clearing the filters
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isScanning && discoveredServices.length === 0 && (
        <div className="p-12 text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
            darkMode ? 'bg-gray-700/30' : 'bg-gray-100'
          }`}>
            <Target className={`w-8 h-8 ${
              darkMode ? 'text-gray-500' : 'text-gray-400'
            }`} />
          </div>
          <h3 className={`text-lg font-medium mb-2 ${
            darkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            No Services Discovered Yet
          </h3>
          <p className={`text-sm ${
            darkMode ? 'text-gray-500' : 'text-gray-500'
          }`}>
            Configure your scan parameters and click "Start Scan" to discover services on your network
          </p>
        </div>
      )}
    </div>
  );
};