import React from 'react';
import { Server, Activity, Trash2, CheckCircle, Clock, Square, AlertCircle } from 'lucide-react';
import type { HostedService } from '../../types/ServiceInterfaces';
import { ServiceStatus } from '../../types/ServiceStatus'; // Remove 'type' keyword

interface ServiceCardProps {
  service: HostedService;
  darkMode?: boolean;
  onHealthCheck?: (service: HostedService) => void;
  onDelete?: (service: HostedService) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  darkMode = true,
  onHealthCheck,
  onDelete
}) => {
  const getStatusConfig = (status: ServiceStatus) => {
    const configs = {
      [ServiceStatus.Running]: {
        icon: CheckCircle,
        className: darkMode 
          ? 'bg-green-900/50 text-green-300 border border-green-800' 
          : 'bg-green-100 text-green-800 border border-green-200',
        label: 'Running',
        dotColor: 'bg-green-400'
      },
      [ServiceStatus.Stopped]: {
        icon: Square,
        className: darkMode 
          ? 'bg-red-900/50 text-red-300 border border-red-800' 
          : 'bg-red-100 text-red-800 border border-red-200',
        label: 'Stopped',
        dotColor: 'bg-red-400'
      },
      [ServiceStatus.Failed]: {
        icon: AlertCircle,
        className: darkMode 
          ? 'bg-red-900/50 text-red-300 border border-red-800' 
          : 'bg-red-100 text-red-800 border border-red-200',
        label: 'Failed',
        dotColor: 'bg-red-400'
      },
      [ServiceStatus.Unknown]: {
        icon: Clock,
        className: darkMode 
          ? 'bg-gray-800 text-gray-300 border border-gray-700' 
          : 'bg-gray-100 text-gray-800 border border-gray-200',
        label: 'Unknown',
        dotColor: 'bg-gray-400'
      }
    };

    const config = configs[status];
    if (!config) {
      console.warn(`Unknown service status: "${status}". Defaulting to Unknown.`);
      return configs[ServiceStatus.Unknown];
    }
    
    return config;
  };

  const normalizedStatus = service.status || ServiceStatus.Unknown;
  const statusConfig = getStatusConfig(normalizedStatus);
  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={`rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 ${
        darkMode 
          ? 'bg-gray-800 border-gray-700 hover:border-gray-600' 
          : 'bg-white border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Card Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center flex-1">
            <div className={`p-2 rounded-lg mr-3 ${
              darkMode ? 'bg-blue-900/50' : 'bg-blue-100'
            }`}>
              <Server className={`w-5 h-5 ${
                darkMode ? 'text-blue-400' : 'text-blue-600'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-lg font-semibold truncate ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {service.name}
              </h3>
              <p className={`text-sm mt-1 line-clamp-2 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {service.description || 'No description'}
              </p>
            </div>
          </div>
          <div className={`w-3 h-3 rounded-full ${statusConfig.dotColor} flex-shrink-0`}></div>
        </div>

        {/* Status Badge */}
        <div className="mb-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusConfig.className}`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusConfig.label}
          </span>
        </div>

        {/* Service Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Image:
            </span>
            <span className={`text-sm font-mono truncate max-w-40 ${
              darkMode ? 'text-gray-300' : 'text-gray-900'
            }`}>
              {service.dockerImage || 'N/A'}
            </span>
          </div>
          
          {service.port && (
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Port:
              </span>
              <span className={`text-sm ${
                darkMode ? 'text-gray-300' : 'text-gray-900'
              }`}>
                {service.port}
              </span>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Environment:
            </span>
            <span className={`text-sm capitalize ${
              darkMode ? 'text-gray-300' : 'text-gray-900'
            }`}>
              {service.environment || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className={`px-6 py-4 border-t ${
        darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50'
      }`}>
        <div className="flex items-center justify-between text-xs mb-3">
          <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
            Created: {new Date(service.createdAt).toLocaleDateString()}
          </span>
          <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
            Updated: {new Date(service.updatedAt).toLocaleDateString()}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button 
            onClick={() => onHealthCheck?.(service)}
            className={`flex-1 inline-flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              darkMode
                ? 'bg-green-900/50 text-green-300 hover:bg-green-900/70'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            <Activity className="w-4 h-4 mr-1" />
            Health Check
          </button>
          <button 
            onClick={() => onDelete?.(service)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              darkMode
                ? 'bg-red-900/50 text-red-300 hover:bg-red-900/70'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};