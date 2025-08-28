import React from 'react';
import { Plus, ExternalLink, Clock, Wifi, WifiOff } from 'lucide-react';
import { getServiceIcon } from './serviceUtilities';
import type { DiscoveredService, StoredDiscoveredService } from '../../types/networkDiscovery';

interface ServicesListProps {
  darkMode?: boolean;
  services: (DiscoveredService | StoredDiscoveredService)[];
  onAddToServices: (service: DiscoveredService | StoredDiscoveredService) => void;
  isServiceAdded: (service: DiscoveredService | StoredDiscoveredService) => boolean;
  isAddingService?: boolean;
}

export const ServicesList: React.FC<ServicesListProps> = ({
  darkMode = true,
  services,
  onAddToServices,
  isServiceAdded,
  isAddingService = false
}) => {
  const formatResponseTime = (responseTime: string | number) => {
    if (typeof responseTime === 'string') {
      return responseTime;
    }
    return `${responseTime}ms`;
  };

  const getServiceUrl = (service: DiscoveredService | StoredDiscoveredService) => {
    const protocol = service.serviceType?.toLowerCase().includes('https') || 
                    service.serviceType?.toLowerCase().includes('ssl') ||
                    service.port === 443 ? 'https' : 'http';
    return `${protocol}://${service.hostAddress}:${service.port}`;
  };

  if (services.length === 0) {
    return (
      <div className={`text-center py-12 ${
        darkMode ? 'text-gray-400' : 'text-gray-600'
      }`}>
        <Wifi className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">No services found</p>
        <p className="text-sm">Try scanning a different network range or host</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {services.map((service, index) => {
        const serviceKey = `${service.hostAddress}:${service.port}`;
        const isAdded = isServiceAdded(service);
        const isStored = 'isActive' in service;
        
        return (
          <div
            key={`${serviceKey}-${index}`}
            className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
              darkMode
                ? 'bg-gray-700/30 border-gray-600/50 hover:bg-gray-700/50 hover:border-gray-500/50'
                : 'bg-white/50 border-gray-200/50 hover:bg-white/80 hover:border-gray-300/50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                {/* Service Icon */}
                <div className={`p-3 rounded-lg ${
                  service.isReachable
                    ? darkMode 
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-green-100/50 text-green-600'
                    : darkMode
                      ? 'bg-red-900/30 text-red-400'
                      : 'bg-red-100/50 text-red-600'
                }`}>
                  {getServiceIcon(service.serviceType)}
                </div>

                {/* Service Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className={`font-semibold text-lg ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {service.hostAddress}:{service.port}
                    </h3>
                    
                    {/* Status Badge */}
                    <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      service.isReachable
                        ? darkMode
                          ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                          : 'bg-green-100 text-green-800 border border-green-200'
                        : darkMode
                          ? 'bg-red-900/30 text-red-400 border border-red-500/30'
                          : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {service.isReachable ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
                      {service.isReachable ? 'Reachable' : 'Unreachable'}
                    </div>

                    {/* Service Type Badge */}
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      darkMode
                        ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {service.serviceType}
                    </span>

                    {/* Active/Stored Badge */}
                    {isStored && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (service as StoredDiscoveredService).isActive
                          ? darkMode
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-green-100 text-green-800'
                          : darkMode
                            ? 'bg-gray-700 text-gray-400'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {(service as StoredDiscoveredService).isActive ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </div>

                  {/* Service Information */}
                  <div className="space-y-2">
                    {service.hostName && service.hostName !== service.hostAddress && (
                      <p className={`text-sm ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        <span className="font-medium">Hostname:</span> {service.hostName}
                      </p>
                    )}

                    {service.banner && (
                      <p className={`text-sm ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <span className="font-medium">Banner:</span> {service.banner}
                      </p>
                    )}

                    <div className="flex items-center space-x-4 text-sm">
                      <div className={`flex items-center ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        <Clock className="w-4 h-4 mr-1" />
                        <span>Response: {formatResponseTime(service.responseTime)}</span>
                      </div>

                      <div className={`${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Discovered: {new Date(service.discoveredAt).toLocaleString()}
                      </div>
                    </div>

                    {isStored && (service as StoredDiscoveredService).lastSeenAt && (
                      <div className={`text-sm ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Last seen: {new Date((service as StoredDiscoveredService).lastSeenAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 ml-4">
                {/* Visit Service Button */}
                {service.isReachable && (service.serviceType.toLowerCase().includes('http') || 
                  service.serviceType.toLowerCase().includes('web') ||
                  service.port === 80 || service.port === 443 || service.port === 8080) && (
                  <a
                    href={getServiceUrl(service)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-2 rounded-lg transition-colors ${
                      darkMode
                        ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-900/20'
                        : 'text-gray-500 hover:text-blue-600 hover:bg-blue-100'
                    }`}
                    title="Open service in browser"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                {/* Add to Services Button */}
                <button
                  onClick={() => onAddToServices(service)}
                  disabled={isAdded || isAddingService}
                  className={`flex items-center px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                    isAdded
                      ? darkMode
                        ? 'bg-green-900/30 text-green-400 border border-green-500/30 cursor-not-allowed'
                        : 'bg-green-100 text-green-800 border border-green-200 cursor-not-allowed'
                      : darkMode
                        ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                  title={isAdded ? 'Already added to services' : 'Add to services'}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {isAdded ? 'Added' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
