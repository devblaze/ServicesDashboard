import React from 'react';
import { Target, History, AlertCircle, X, Clock, ExternalLink } from 'lucide-react';
import { useNetworkDiscovery } from '../../hooks/useNetworkDiscovery.ts';
import { ScanControls } from '../networkDiscovery/ScanControls.tsx';
import { ServicesFilters } from '../networkDiscovery/ServicesFiltersComponent.tsx';
import { ServicesList } from '../networkDiscovery/ServicesListComponent.tsx';
import { getScanStatusIcon, getServiceIcon } from '../networkDiscovery/serviceUtilities.tsx';

interface NetworkDiscoveryProps {
  darkMode?: boolean;
}

export const NetworkDiscovery: React.FC<NetworkDiscoveryProps> = ({ darkMode = true }) => {
  const {
    // State
    networkRange, setNetworkRange,
    hostAddress, setHostAddress,
    customPorts, setCustomPorts,
    scanType, setScanType,
    scanMode, setScanMode,
    fullScan, setFullScan,
    showHistory, setShowHistory,

    // Filter state
    searchFilter, setSearchFilter,
    serviceTypeFilter, setServiceTypeFilter,
    portFilter, setPortFilter,
    showOnlyAdded, setShowOnlyAdded,
    showOnlyActive, setShowOnlyActive,
    showFilters, setShowFilters,

    // Data
    commonPorts,
    scanProgress,
    filteredServices,
    discoveredServices,
    currentTarget,
    uniqueServiceTypes,
    uniquePorts,
    recentScans,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,

    // Computed
    isScanning,
    error,
    hasActiveFilters,
    hasStoredServices,

    // Functions
    handleScan,
    handleAddToServices,
    refetchRecentScans,
    cancelCurrentScan,
    resetFilters,
    isServiceAdded,
    loadHistoricalScan
  } = useNetworkDiscovery();

  return (
    <div className={`rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
      darkMode 
        ? 'bg-gray-800/50 border-gray-700/50 shadow-lg shadow-gray-900/20' 
        : 'bg-white/80 border-gray-200/50 shadow-lg shadow-gray-200/20'
    }`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
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

          {/* History Button */}
          <button
            onClick={() => {
              setShowHistory(!showHistory);
              if (!showHistory) {
                refetchRecentScans();
              }
            }}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
              darkMode
                ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white'
                : 'bg-gray-100/50 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            } hover:scale-105 active:scale-95`}
          >
            <History className="w-4 h-4 mr-2" />
            History
          </button>
        </div>

        {/* Scan Status with Real-time Progress */}
        {scanProgress && (
          <div className={`mb-6 p-4 rounded-xl border ${
            darkMode
              ? 'bg-blue-900/20 border-blue-600/30'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getScanStatusIcon(scanProgress.status)}
                <div>
                  <p className={`font-medium ${
                    darkMode ? 'text-blue-300' : 'text-blue-700'
                  }`}>
                    Scan Status: {scanProgress.status.charAt(0).toUpperCase() + scanProgress.status.slice(1)}
                  </p>
                  <p className={`text-sm ${
                    darkMode ? 'text-blue-400' : 'text-blue-600'
                  }`}>
                    Target: {scanProgress.target} • Started: {new Date(scanProgress.startedAt).toLocaleTimeString()}
                  </p>
                  {scanProgress.discoveredCount > 0 && (
                    <p className={`text-sm ${
                      darkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      Discovered {scanProgress.discoveredCount} services so far
                    </p>
                  )}
                </div>
              </div>

              {/* Cancel Button */}
              {(scanProgress.status === 'running' || scanProgress.status === 'pending') && (
                <button
                  onClick={cancelCurrentScan}
                  className={`p-2 rounded-lg transition-colors duration-200 ${
                    darkMode
                      ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/20'
                      : 'text-gray-500 hover:text-red-600 hover:bg-red-100'
                  }`}
                  title="Cancel scan tracking"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Real-time Latest Services */}
            {scanProgress.latestServices && scanProgress.latestServices.length > 0 && (
              <div className="mt-4">
                <p className={`text-sm font-medium mb-2 ${
                  darkMode ? 'text-blue-300' : 'text-blue-700'
                }`}>
                  Latest discovered services:
                </p>
                <div className="space-y-2">
                  {scanProgress.latestServices.map((service, index) => (
                    <div
                      key={`${service.hostAddress}-${service.port}-${index}`}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        darkMode
                          ? 'bg-blue-800/20 border border-blue-700/30'
                          : 'bg-blue-100 border border-blue-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {getServiceIcon(service.serviceType)}
                        <span className={`text-sm font-medium ${
                          darkMode ? 'text-blue-200' : 'text-blue-800'
                        }`}>
                          {service.hostAddress}:{service.port}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          darkMode
                            ? 'bg-blue-700/50 text-blue-300'
                            : 'bg-blue-200 text-blue-700'
                        }`}>
                          {service.serviceType}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs">
                        <Clock className="w-3 h-3" />
                        <span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>
                          {new Date(service.discoveredAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {scanProgress.errorMessage && (
              <div className={`mt-3 p-3 rounded-lg ${
                darkMode
                  ? 'bg-red-900/20 text-red-300'
                  : 'bg-red-100 text-red-700'
              }`}>
                <p className="text-sm">{scanProgress.errorMessage}</p>
              </div>
            )}
          </div>
        )}

        <ScanControls
          darkMode={darkMode}
          scanMode={scanMode}
          setScanMode={setScanMode}
          scanType={scanType}
          setScanType={setScanType}
          networkRange={networkRange}
          setNetworkRange={setNetworkRange}
          hostAddress={hostAddress}
          setHostAddress={setHostAddress}
          customPorts={customPorts}
          setCustomPorts={setCustomPorts}
          fullScan={fullScan}
          setFullScan={setFullScan}
          isScanning={isScanning}
          onScan={handleScan}
          commonPorts={commonPorts}
        />

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

        {/* Recent Scans History Panel */}
        {showHistory && (
          <div className={`mt-6 p-4 rounded-xl border ${
            darkMode
              ? 'bg-gray-700/30 border-gray-600/50'
              : 'bg-gray-50/50 border-gray-200/50'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Recent Scans
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode
                    ? 'text-gray-400 hover:text-white hover:bg-gray-600/50'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {recentScans && recentScans.length > 0 ? (
              <div className="space-y-2">
                {recentScans.map((scan) => (
                  <div
                    key={scan.id}
                    onClick={() => loadHistoricalScan(scan)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                      darkMode
                        ? 'bg-gray-800/50 border-gray-600/50 hover:border-blue-500/50 hover:bg-gray-700/50'
                        : 'bg-white/50 border-gray-200 hover:border-blue-400 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`font-medium ${
                            darkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {scan.target}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            scan.status === 'completed'
                              ? darkMode
                                ? 'bg-green-900/30 text-green-400 border border-green-700/50'
                                : 'bg-green-100 text-green-700 border border-green-300'
                              : scan.status === 'running'
                              ? darkMode
                                ? 'bg-blue-900/30 text-blue-400 border border-blue-700/50'
                                : 'bg-blue-100 text-blue-700 border border-blue-300'
                              : darkMode
                              ? 'bg-red-900/30 text-red-400 border border-red-700/50'
                              : 'bg-red-100 text-red-700 border border-red-300'
                          }`}>
                            {scan.status}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            darkMode
                              ? 'bg-gray-700 text-gray-300'
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {scan.scanType}
                          </span>
                        </div>
                        <div className={`flex items-center space-x-4 text-sm ${
                          darkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(scan.startedAt).toLocaleString()}
                          </span>
                          {scan.serviceCount && scan.serviceCount > 0 && (
                            <span>
                              {scan.serviceCount} service{scan.serviceCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      {scan.status === 'completed' && (
                        <ExternalLink className={`w-4 h-4 ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-8 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No recent scans found</p>
                <p className="text-sm mt-1">Run a scan to see it here</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Section */}
      {discoveredServices.length > 0 && (
        <div className="p-6">
          {/* Results Header */}
          <div className="mb-6">
            <h3 className={`text-lg font-semibold mb-2 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Discovered Services
              <span className={`ml-2 text-sm font-normal ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                ({filteredServices.length} of {discoveredServices.length} services
                {currentTarget && ` on ${currentTarget}`})
              </span>
            </h3>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <ServicesFilters
              darkMode={darkMode}
              searchFilter={searchFilter}
              setSearchFilter={setSearchFilter}
              serviceTypeFilter={serviceTypeFilter}
              setServiceTypeFilter={setServiceTypeFilter}
              portFilter={portFilter}
              setPortFilter={setPortFilter}
              showOnlyAdded={showOnlyAdded}
              setShowOnlyAdded={setShowOnlyAdded}
              showOnlyActive={showOnlyActive}
              setShowOnlyActive={setShowOnlyActive}
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              uniqueServiceTypes={uniqueServiceTypes}
              uniquePorts={uniquePorts}
              hasActiveFilters={Boolean(hasActiveFilters)}
              hasStoredServices={Boolean(hasStoredServices)}
              onResetFilters={resetFilters}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
            />
          </div>

          {/* Services List */}
          <ServicesList
            darkMode={darkMode}
            services={filteredServices}
            onAddToServices={handleAddToServices}
            isServiceAdded={isServiceAdded}
          />
        </div>
      )}
    </div>
  );
};