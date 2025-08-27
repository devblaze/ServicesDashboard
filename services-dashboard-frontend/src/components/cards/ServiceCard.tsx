import React from 'react';
import { 
  Activity, 
  Clock, 
  ExternalLink, 
  Trash2,
  Globe,
  Container
} from 'lucide-react';
import type { HostedService } from '../../types/Service';
import { ServiceStatus } from '../../types/ServiceStatus';

interface ServiceCardProps {
  service: HostedService;
  darkMode?: boolean;
  onHealthCheck: (service: HostedService) => void;
  onDelete: (service: HostedService) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  darkMode = true,
  onHealthCheck,
  onDelete
}) => {
  const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case ServiceStatus.Running:
        return 'text-green-400';
      case ServiceStatus.Unknown:
        return 'text-yellow-400';
      case ServiceStatus.Stopped:
      case ServiceStatus.Failed:
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusBg = (status: ServiceStatus) => {
    switch (status) {
      case ServiceStatus.Running:
        return 'bg-green-500/20 border-green-500/30';
      case ServiceStatus.Unknown:
        return 'bg-yellow-500/20 border-yellow-500/30';
      case ServiceStatus.Stopped:
      case ServiceStatus.Failed:
        return 'bg-red-500/20 border-red-500/30';
      default:
        return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  const formatUptime = (uptime: number) => {
    if (uptime < 60) return `${Math.floor(uptime)}s`;
    if (uptime < 3600) return `${Math.floor(uptime / 60)}m`;
    if (uptime < 86400) return `${Math.floor(uptime / 3600)}h`;
    return `${Math.floor(uptime / 86400)}d`;
  };

  const getServiceTypeIcon = () => {
    if (service.dockerImage || service.serviceType === 'docker') {
      return <Container className="w-5 h-5" />;
    }
    return <Globe className="w-5 h-5" />;
  };

  const getServiceTypeLabel = () => {
    if (service.dockerImage || service.serviceType === 'docker') {
      return 'Docker';
    }
    return 'External';
  };

  return (
    <div className={`rounded-xl border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] ${
      darkMode
        ? 'bg-gray-800/50 border-gray-700/50 shadow-lg shadow-gray-900/20 hover:shadow-gray-900/40'
        : 'bg-white/80 border-gray-200/50 shadow-lg shadow-gray-200/20 hover:shadow-gray-200/40'
    }`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-900/50' : 'bg-blue-100/50'}`}>
              {getServiceTypeIcon()}
            </div>
            <div>
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {service.name}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  darkMode ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-100/50 text-gray-600'
                }`}>
                  {getServiceTypeLabel()}
                </span>
                {service.environment && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    service.environment === 'production'
                      ? 'bg-red-500/20 text-red-400'
                      : service.environment === 'staging'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {service.environment}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className={`flex items-center space-x-1 px-3 py-1 rounded-full border text-xs font-medium ${
            getStatusBg(service.status)
          } ${getStatusColor(service.status)}`}>
            <div className={`w-2 h-2 rounded-full ${
              service.status === ServiceStatus.Running ? 'bg-green-400' :
              service.status === ServiceStatus.Unknown ? 'bg-yellow-400' :
              'bg-red-400'
            }`} />
            <span>{service.status}</span>
          </div>
        </div>

        {/* Service Details */}
        <div className="space-y-3 mb-4">
          {service.description && (
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {service.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            {/* Service location */}
            <div>
              <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {service.serviceType === 'external' || service.hostAddress ? 'Host:' : 'Image:'}
              </span>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} truncate`}>
                {service.hostAddress || service.dockerImage || 'N/A'}
              </p>
            </div>

            {/* Port */}
            {service.port && (
              <div>
                <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Port:
                </span>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {service.port}
                </p>
              </div>
            )}

            {/* Uptime */}
            {service.uptime !== undefined && (
              <div>
                <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Uptime:
                </span>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} flex items-center`}>
                  <Clock className="w-3 h-3 mr-1" />
                  {formatUptime(service.uptime)}
                </p>
              </div>
            )}

            {/* Last Health Check */}
            {service.lastHealthCheck && (
              <div>
                <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Last Check:
                </span>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {new Date(service.lastHealthCheck).toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>

          {/* Logs availability indicator */}
          {service.logsAvailable && (
            <div className={`flex items-center space-x-2 text-xs ${
              darkMode ? 'text-green-400' : 'text-green-600'
            }`}>
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span>Logs available</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={() => onHealthCheck(service)}
            className={`flex items-center flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              darkMode
                ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white'
                : 'bg-gray-100/50 hover:bg-gray-200/50 text-gray-700 hover:text-gray-900'
            }`}
          >
            <Activity className="w-4 h-4 mr-2" />
            Health Check
          </button>

          {service.healthCheckUrl && (
            <button
              onClick={() => window.open(service.healthCheckUrl, '_blank')}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                darkMode
                  ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white'
                  : 'bg-gray-100/50 hover:bg-gray-200/50 text-gray-700 hover:text-gray-900'
              }`}
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => onDelete(service)}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              darkMode
                ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400 hover:text-red-300'
                : 'bg-red-100/50 hover:bg-red-200/50 text-red-600 hover:text-red-700'
            }`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};