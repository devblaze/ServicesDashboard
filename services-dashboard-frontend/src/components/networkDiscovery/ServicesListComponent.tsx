import React, { useState } from 'react';
import { Plus, ExternalLink, Clock, Wifi, WifiOff, Sparkles, Check, Loader2, Server } from 'lucide-react';
import { getServiceIcon } from './serviceUtilities';
import { AddServerFromDiscoveryModal } from './AddServerFromDiscoveryModal';
import type { DiscoveredService, StoredDiscoveredService } from '../../types/networkDiscovery';

// Extended interface to handle optional AI properties
interface ServiceWithAI extends DiscoveredService {
  recognizedName?: string;
  aiConfidence?: number;
  serviceCategory?: string;
  suggestedDescription?: string;
}

interface ServicesListProps {
  darkMode?: boolean;
  services: (DiscoveredService | StoredDiscoveredService)[];
  onAddToServices: (service: DiscoveredService | StoredDiscoveredService) => void;
  isServiceAdded: (service: DiscoveredService | StoredDiscoveredService) => boolean;
  isAddingService?: boolean;
}

// In your service display component
const formatBanner = (banner: string | undefined) => {
  if (!banner) return null;
  
  // If it's HTTP headers, format them nicely
  if (banner.includes('HTTP/') || banner.includes('Server:')) {
    const parts = banner.split('|').map(part => part.trim());
    return (
      <div className="text-xs space-y-1">
        {parts.map((part, index) => (
          <div key={index} className="font-mono">{part}</div>
        ))}
      </div>
    );
  }
  
  return <span className="text-xs font-mono">{banner}</span>;
};

export const ServicesList: React.FC<ServicesListProps> = ({
  darkMode = true,
  services,
  onAddToServices,
  isServiceAdded,
  isAddingService = false
}) => {
  const [selectedSshService, setSelectedSshService] = useState<DiscoveredService | StoredDiscoveredService | null>(null);
  const [showAddServerModal, setShowAddServerModal] = useState(false);

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

  const getServiceName = (service: DiscoveredService | StoredDiscoveredService) => {
    const aiService = service as ServiceWithAI;
    // Use AI-recognized name if available and confident
    if (aiService.recognizedName && aiService.aiConfidence && aiService.aiConfidence > 0.7) {
      return aiService.recognizedName;
    }
    // Fallback to host:port
    return `${service.hostAddress}:${service.port}`;
  };

  const isStoredService = (service: DiscoveredService | StoredDiscoveredService): service is StoredDiscoveredService => {
    return 'isActive' in service;
  };

  const hasLastSeenAt = (service: StoredDiscoveredService): service is StoredDiscoveredService & { lastSeenAt: Date } => {
    return 'lastSeenAt' in service && service.lastSeenAt != null;
  };

  const isSshService = (service: DiscoveredService | StoredDiscoveredService): boolean => {
    return service.port === 22 ||
           service.serviceType?.toLowerCase().includes('ssh') ||
           service.canAddAsServer === true;
  };

  const handleAddAsServer = (service: DiscoveredService | StoredDiscoveredService) => {
    setSelectedSshService(service);
    setShowAddServerModal(true);
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
        const serviceName = getServiceName(service);
        const aiService = service as ServiceWithAI;
        const storedService = isStoredService(service) ? service : null;
        
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
                      {serviceName}
                    </h3>
                    
                    {/* AI Confidence Badge */}
                    {aiService.aiConfidence && aiService.aiConfidence > 0.7 && (
                      <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        darkMode
                          ? 'bg-purple-900/30 text-purple-400 border border-purple-500/30'
                          : 'bg-purple-100 text-purple-800 border border-purple-200'
                      }`}>
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI: {Math.round(aiService.aiConfidence * 100)}%
                      </div>
                    )}
                    
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
                      {service.isReachable ? (
                        <>
                          <Wifi className="w-3 h-3 mr-1" />
                          Online
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-3 h-3 mr-1" />
                          Offline
                        </>
                      )}
                    </div>

                    {/* Active/Inactive Badge for StoredDiscoveredService */}
                    {storedService && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        storedService.isActive
                          ? darkMode
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-green-100 text-green-800'
                          : darkMode
                            ? 'bg-gray-700 text-gray-400'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {storedService.isActive ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </div>

                  {/* Service Description */}
                  <div className={`mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium">Service:</span>
                      <span>{service.serviceType}</span>
                      {aiService.serviceCategory && (
                        <>
                          <span className="text-gray-500">•</span>
                          <span className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            {aiService.serviceCategory}
                          </span>
                        </>
                      )}
                    </div>
                    
                    {/* AI-suggested description */}
                    {aiService.suggestedDescription && aiService.aiConfidence && aiService.aiConfidence > 0.7 && (
                      <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {aiService.suggestedDescription}
                      </p>
                    )}
                  </div>

                  {/* Technical Details */}
                  <div className={`grid grid-cols-2 gap-4 text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <div>
                      <span className="font-medium">Host:</span> {service.hostAddress}
                    </div>
                    <div>
                      <span className="font-medium">Port:</span> {service.port}
                    </div>
                    {service.hostName !== service.hostAddress && (
                      <div className="col-span-2">
                        <span className="font-medium">Hostname:</span> {service.hostName}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Response:</span> {formatResponseTime(service.responseTime)}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{new Date(service.discoveredAt).toLocaleString()}</span>
                    </div>
                    {storedService && hasLastSeenAt(storedService) && (
                      <div className="flex items-center">
                        <span className="font-medium">Last seen:</span>
                        <span className="ml-1">{new Date(storedService.lastSeenAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Banner (if available) */}
                  {service.banner && (
                    <div className={`mt-3 p-2 rounded text-xs font-mono ${
                      darkMode ? 'bg-gray-800/50 text-gray-300' : 'bg-gray-100/50 text-gray-700'
                    }`}>
                      <div className="font-medium mb-1">Banner:</div>
                      <div className="truncate">{formatBanner(service.banner)}</div>
                    </div>
                  )}
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

                {/* Add as Server Button for SSH Services */}
                {isSshService(service) && service.isReachable && !isAdded && (
                  <button
                    onClick={() => handleAddAsServer(service)}
                    className={`flex items-center px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                      darkMode
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-purple-500 text-white hover:bg-purple-600'
                    } hover:scale-105 active:scale-95`}
                    title="Add this SSH service as a managed server"
                  >
                    <Server className="w-4 h-4 mr-2" />
                    Add as Server
                  </button>
                )}

                {/* Add to Services Button */}
                {!isAdded && !isSshService(service) && (
                  <button
                    onClick={() => onAddToServices(service)}
                    disabled={isAddingService}
                    className={`flex items-center px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                      darkMode
                        ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600'
                        : 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-400'
                    } disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95`}
                  >
                    {isAddingService ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Add to Services
                  </button>
                )}

                {/* Already Added Badge */}
                {isAdded && (
                  <div className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                    darkMode
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    <Check className="w-4 h-4 mr-2" />
                    Added
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Add Server Modal */}
      {showAddServerModal && selectedSshService && (
        <AddServerFromDiscoveryModal
          darkMode={darkMode}
          service={selectedSshService}
          onClose={() => {
            setShowAddServerModal(false);
            setSelectedSshService(null);
          }}
          onSuccess={() => {
            setShowAddServerModal(false);
            setSelectedSshService(null);
          }}
        />
      )}
    </div>
  );
};