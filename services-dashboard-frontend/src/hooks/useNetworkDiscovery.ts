import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { networkDiscoveryApi } from '../services/networkDiscoveryApi';
import type { 
  ScanMode,
  DiscoveredService, 
  StoredDiscoveredService,
  NetworkScanSession,
  StartScanRequest,
  QuickScanRequest,
  AddToServicesRequest
} from '../types/networkDiscovery';

export type { ScanMode };

// Helper functions for localStorage
const STORAGE_KEYS = {
  CURRENT_SCAN_ID: 'networkDiscovery_currentScanId',
  CURRENT_TARGET: 'networkDiscovery_currentTarget',
} as const;

const getStoredScanId = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_SCAN_ID);
  } catch {
    return null;
  }
};

const setStoredScanId = (scanId: string | null) => {
  try {
    if (scanId) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_SCAN_ID, scanId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_SCAN_ID);
    }
  } catch {
    // Ignore localStorage errors
  }
};

const getStoredTarget = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_TARGET);
  } catch {
    return null;
  }
};

const setStoredTarget = (target: string | null) => {
  try {
    if (target) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_TARGET, target);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_TARGET);
    }
  } catch {
    // Ignore localStorage errors
  }
};

export const useNetworkDiscovery = () => {
  const [networkRange, setNetworkRange] = useState('192.168.4.0/24');
  const [hostAddress, setHostAddress] = useState('');
  const [customPorts, setCustomPorts] = useState('');
  const [scanType, setScanType] = useState<'network' | 'host'>('network');
  const [scanMode, setScanMode] = useState<ScanMode>('background');
  const [fullScan, setFullScan] = useState(false);
  
  // Results state - Initialize from localStorage
  const [discoveredServices, setDiscoveredServices] = useState<(DiscoveredService | StoredDiscoveredService)[]>([]);
  const [addedServices, setAddedServices] = useState<Set<string>>(new Set());
  const [currentScanId, setCurrentScanId] = useState<string | null>(getStoredScanId());
  const [currentTarget, setCurrentTarget] = useState<string>(getStoredTarget() || '');
  
  // Filter states
  const [searchFilter, setSearchFilter] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('');
  const [portFilter, setPortFilter] = useState('');
  const [showOnlyAdded, setShowOnlyAdded] = useState(false);
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const queryClient = useQueryClient();

  // Update localStorage whenever currentScanId or currentTarget changes
  useEffect(() => {
    setStoredScanId(currentScanId);
  }, [currentScanId]);

  useEffect(() => {
    setStoredTarget(currentTarget);
  }, [currentTarget]);

  // Get common ports
  const { data: commonPorts = [] } = useQuery({
    queryKey: ['common-ports'],
    queryFn: () => networkDiscoveryApi.getCommonPorts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get recent scans
  const { data: recentScans = [], refetch: refetchRecentScans } = useQuery({
    queryKey: ['recent-scans'],
    queryFn: () => networkDiscoveryApi.getRecentScans(10),
    enabled: showHistory,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Poll scan status when we have an active scan
  const scanStatusQuery = useQuery({
    queryKey: ['scan-status', currentScanId],
    queryFn: () => currentScanId ? networkDiscoveryApi.getScanStatus(currentScanId) : null,
    enabled: !!currentScanId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || data.status === 'completed' || data.status === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
    retry: (failureCount, error) => {
      // If scan ID is not found, clear it and stop retrying
      if (error && 'response' in error && (error as any).response?.status === 404) {
        setCurrentScanId(null);
        return false;
      }
      return failureCount < 3;
    }
  });

  const scanStatus = scanStatusQuery.data;
  const refetchScanStatus = scanStatusQuery.refetch;

  // Check for active scans on component mount
  useEffect(() => {
    const checkForActiveScan = async () => {
      if (currentScanId && !scanStatus) {
        try {
          // Try to get scan status to see if it's still valid
          await networkDiscoveryApi.getScanStatus(currentScanId);
        } catch (error) {
          // If scan ID is invalid, clear it
          console.warn('Stored scan ID is no longer valid, clearing it');
          setCurrentScanId(null);
        }
      }
    };

    checkForActiveScan();
  }, [currentScanId, scanStatus]);

  // Start background scan mutation
  const startBackgroundScanMutation = useMutation({
    mutationFn: (request: StartScanRequest) => networkDiscoveryApi.startScan(request),
    onSuccess: (data) => {
      setCurrentScanId(data.scanId);
      setCurrentTarget(scanType === 'network' ? networkRange : hostAddress);
      resetFilters();
    },
    onError: (error: Error) => {
      console.error('Failed to start background scan:', error);
    }
  });

  // Quick scan mutation (for immediate results)
  const quickScanMutation = useMutation({
    mutationFn: (request: QuickScanRequest) => networkDiscoveryApi.quickScan(request),
    onSuccess: (data) => {
      setDiscoveredServices(data);
      setAddedServices(new Set());
      resetFilters();
      // Clear any stored scan state for quick scans
      setCurrentScanId(null);
    },
    onError: (error: Error) => {
      console.error('Quick scan failed:', error);
    }
  });

  // Add to services mutation
  const addToServicesMutation = useMutation({
    mutationFn: (request: AddToServicesRequest) => networkDiscoveryApi.addToServices(request),
    onSuccess: (data, variables) => {
      console.log('Service added successfully:', data);
      const serviceKey = `${variables.hostAddress}:${variables.port}`;
      setAddedServices(prev => new Set([...prev, serviceKey]));
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
    onError: (error: Error) => {
      console.error('Failed to add service:', error);
    }
  });

  // Load scan results when scan completes
  useEffect(() => {
    if (scanStatus?.status === 'completed' && currentScanId) {
      loadScanResults(currentScanId);
    } else if (scanStatus?.status === 'failed' && currentScanId) {
      // Clear failed scans
      setCurrentScanId(null);
    }
  }, [scanStatus?.status, currentScanId]);

  // Load latest results for current target when component mounts
  useEffect(() => {
    const target = scanType === 'network' ? networkRange : hostAddress;
    if (target && target !== currentTarget && !currentScanId) {
      setCurrentTarget(target);
      loadLatestResults(target);
    }
  }, [networkRange, hostAddress, scanType, currentTarget, currentScanId]);

  const loadScanResults = async (scanId: string) => {
    try {
      const results = await networkDiscoveryApi.getScanResults(scanId);
      setDiscoveredServices(results);
      setAddedServices(new Set());
      resetFilters();
      setCurrentScanId(null); // Clear after loading results
    } catch (error) {
      console.error('Failed to load scan results:', error);
      setCurrentScanId(null); // Clear if results can't be loaded
    }
  };

  const loadLatestResults = async (target: string) => {
    try {
      const results = await networkDiscoveryApi.getLatestResults(target);
      if (results.length > 0) {
        setDiscoveredServices(results);
        resetFilters();
      }
    } catch (error) {
      // Silently handle errors for latest results since this is not critical
      console.warn('Failed to load latest results (this is normal for first-time scans):', error);
    }
  };

  const resetFilters = () => {
    setSearchFilter('');
    setServiceTypeFilter('');
    setPortFilter('');
    setShowOnlyAdded(false);
    setShowOnlyActive(false);
  };

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
      
      if (searchFilter) {
        const searchLower = searchFilter.toLowerCase();
        const matchesSearch = 
          service.hostAddress.toLowerCase().includes(searchLower) ||
          service.serviceType.toLowerCase().includes(searchLower) ||
          (service.banner && service.banner.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }

      if (serviceTypeFilter && service.serviceType !== serviceTypeFilter) {
        return false;
      }

      if (portFilter && service.port.toString() !== portFilter) {
        return false;
      }

      if (showOnlyAdded && !addedServices.has(serviceKey)) {
        return false;
      }

      if (showOnlyActive && 'isActive' in service && !service.isActive) {
        return false;
      }

      return true;
    });
  }, [discoveredServices, searchFilter, serviceTypeFilter, portFilter, showOnlyAdded, showOnlyActive, addedServices]);

  const handleScan = () => {
    const target = scanType === 'network' ? networkRange : hostAddress;
    const ports = customPorts 
      ? customPorts.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p))
      : undefined;

    if (scanMode === 'quick') {
      const quickScanRequest: QuickScanRequest = { target };
      quickScanMutation.mutate(quickScanRequest);
    } else {
      const startScanRequest: StartScanRequest = {
        target,
        scanType,
        ports,
        fullScan
      };
      startBackgroundScanMutation.mutate(startScanRequest);
    }
  };

  const handleAddToServices = (service: DiscoveredService | StoredDiscoveredService) => {
    const serviceName = service.banner 
      ? `${service.serviceType} - ${service.banner}`.substring(0, 50)
      : `${service.serviceType} on ${service.hostAddress}`;

    const addToServicesRequest: AddToServicesRequest = {
      name: serviceName,
      description: `Discovered ${service.serviceType} service on ${service.hostAddress}:${service.port}${service.banner ? ` - ${service.banner}` : ''}`,
      hostAddress: service.hostAddress,
      port: service.port,
      serviceType: service.serviceType,
      banner: service.banner
    };

    addToServicesMutation.mutate(addToServicesRequest);
  };

  const loadHistoricalScan = async (scan: NetworkScanSession) => {
    if (scan.status === 'completed') {
      await loadScanResults(scan.id);
      setCurrentTarget(scan.target);
      setShowHistory(false);
    }
  };

  // Add a function to manually cancel/clear current scan
  const cancelCurrentScan = () => {
    setCurrentScanId(null);
    console.log('Current scan cleared');
  };

  const isScanning = quickScanMutation.isPending || !!currentScanId;
  const isServiceAdded = (service: DiscoveredService | StoredDiscoveredService) => {
    const serviceKey = `${service.hostAddress}:${service.port}`;
    return addedServices.has(serviceKey);
  };

  const error = quickScanMutation.error || startBackgroundScanMutation.error || addToServicesMutation.error;
  const hasActiveFilters = searchFilter || serviceTypeFilter || portFilter || showOnlyAdded || showOnlyActive;
  const hasStoredServices = discoveredServices.some(service => 'isActive' in service);

  return {
    // State
    networkRange, setNetworkRange,
    hostAddress, setHostAddress,
    customPorts, setCustomPorts,
    scanType, setScanType,
    scanMode, setScanMode,
    fullScan, setFullScan,
    discoveredServices,
    currentTarget,
    
    // Filter state
    searchFilter, setSearchFilter,
    serviceTypeFilter, setServiceTypeFilter,
    portFilter, setPortFilter,
    showOnlyAdded, setShowOnlyAdded,
    showOnlyActive, setShowOnlyActive,
    showFilters, setShowFilters,
    showHistory, setShowHistory,
    
    // Computed values
    commonPorts,
    recentScans,
    scanStatus,
    uniqueServiceTypes,
    uniquePorts,
    filteredServices,
    isScanning,
    error,
    hasActiveFilters,
    hasStoredServices,
    
    // Functions
    handleScan,
    handleAddToServices,
    loadHistoricalScan,
    resetFilters,
    isServiceAdded,
    refetchRecentScans,
    refetchScanStatus,
    cancelCurrentScan // New function to manually clear scans
  };
};