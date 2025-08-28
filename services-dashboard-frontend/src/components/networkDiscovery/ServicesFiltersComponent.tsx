import React from 'react';
import { Search, Filter, X } from 'lucide-react';

interface ServicesFiltersProps {
  darkMode?: boolean;
  searchFilter: string;
  setSearchFilter: (value: string) => void;
  serviceTypeFilter: string;
  setServiceTypeFilter: (value: string) => void;
  portFilter: string;
  setPortFilter: (value: string) => void;
  showOnlyAdded: boolean;
  setShowOnlyAdded: (value: boolean) => void;
  showOnlyActive: boolean;
  setShowOnlyActive: (value: boolean) => void;
  showFilters: boolean;
  setShowFilters: (value: boolean) => void;
  uniqueServiceTypes: string[];
  uniquePorts: string[];
  hasActiveFilters: boolean;
  hasStoredServices: boolean;
  onResetFilters: () => void;
}

export const ServicesFilters: React.FC<ServicesFiltersProps> = ({
  darkMode = true,
  searchFilter,
  setSearchFilter,
  serviceTypeFilter,
  setServiceTypeFilter,
  portFilter,
  setPortFilter,
  showOnlyAdded,
  setShowOnlyAdded,
  showOnlyActive,
  setShowOnlyActive,
  showFilters,
  setShowFilters,
  uniqueServiceTypes,
  uniquePorts,
  hasActiveFilters,
  hasStoredServices,
  onResetFilters
}) => {
  return (
    <div className="space-y-4">
      {/* Filter Toggle and Search */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search services, hosts, or banners..."
            className={`w-full pl-10 pr-4 py-2 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              darkMode
                ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            showFilters || hasActiveFilters
              ? darkMode
                ? 'bg-blue-600 text-white'
                : 'bg-blue-500 text-white'
              : darkMode
                ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                : 'bg-gray-100/50 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <span className={`ml-2 w-2 h-2 rounded-full ${
              darkMode ? 'bg-yellow-400' : 'bg-yellow-500'
            }`} />
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className={`p-2 rounded-lg transition-colors ${
              darkMode
                ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/20'
                : 'text-gray-500 hover:text-red-600 hover:bg-red-100'
            }`}
            title="Clear all filters"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className={`p-4 rounded-xl border space-y-4 ${
          darkMode
            ? 'bg-gray-700/30 border-gray-600/50'
            : 'bg-gray-50/50 border-gray-200/50'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                className={`w-full px-3 py-2 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode
                    ? 'bg-gray-700/50 border-gray-600 text-white'
                    : 'bg-white/50 border-gray-300 text-gray-900'
                }`}
              >
                <option value="">All service types</option>
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
                className={`w-full px-3 py-2 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode
                    ? 'bg-gray-700/50 border-gray-600 text-white'
                    : 'bg-white/50 border-gray-300 text-gray-900'
                }`}
              >
                <option value="">All ports</option>
                {uniquePorts.map(port => (
                  <option key={port} value={port}>{port}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggle Filters */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyAdded}
                onChange={(e) => setShowOnlyAdded(e.target.checked)}
                className={`w-4 h-4 rounded border-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-blue-600'
                    : 'bg-white border-gray-300 text-blue-600'
                }`}
              />
              <span className={`ml-2 text-sm font-medium ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Show only added services
              </span>
            </label>

            {hasStoredServices && (
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyActive}
                  onChange={(e) => setShowOnlyActive(e.target.checked)}
                  className={`w-4 h-4 rounded border-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-blue-600'
                      : 'bg-white border-gray-300 text-blue-600'
                  }`}
                />
                <span className={`ml-2 text-sm font-medium ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Show only active services
                </span>
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
};