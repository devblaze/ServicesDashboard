import React from 'react';
import { 
  Activity, 
  Clock, 
  ExternalLink, 
  Trash2,
  Globe,
  Container,
  FileText
} from 'lucide-react';
import type { HostedService } from '../../types/Service';

interface ServiceCardProps {
  service: HostedService;
  darkMode?: boolean;
  onHealthCheck: (service: HostedService) => void;
  onDelete: (service: HostedService) => void;
  onViewLogs?: (service: HostedService) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  darkMode = true,
  onHealthCheck,
  onDelete,
  onViewLogs
}) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'running':
        return 'text-green-400';
      case 'unknown':
        return 'text-yellow-400';
      case 'unhealthy':
      case 'stopped':
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'running':
        return 'bg-green-500/20 border-green-500/30';
      case 'unknown':
        return 'bg-yellow-500/20 border-yellow-500/30';
      case 'unhealthy':
      case 'stopped':
      case 'failed':
        return 'bg-red-500/20 border-red-500/30';
      default:
        return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  const getServiceTypeIcon = () => {
    // Use serviceType from the interface, or fall back to checking dockerImage
    if (service.serviceType === 'docker' || service.dockerImage) {
      return <Container className="w-5 h-5" />;
    }
    return <Globe className="w-5 h-5" />;
  };

  const getServiceTypeLabel = () => {
    // Use serviceType from the interface, or fall back to checking dockerImage
    return (service.serviceType === 'docker' || service.dockerImage) ? 'Docker' : 'External';
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
                    darkMode ? 'bg-purple-700/50 text-purple-300' : 'bg-purple-100/50 text-purple-600'
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
              service.status.toLowerCase() === 'healthy' || service.status.toLowerCase() === 'running' ? 'bg-green-400' :
              service.status.toLowerCase() === 'unknown' ? 'bg-yellow-400' :
              'bg-red-400'
            }`} />
            <span>{service.status}</span>
          </div>
        </div>

        {/* Service Details */}
        <div className="space-y-3 mb-4">
          {service.description && (
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {service.description}
            </p>
          )}

          {/* Docker Image Information */}
          {service.dockerImage && (
            <div className={`p-3 rounded-lg border ${
              darkMode ? 'bg-gray-700/30 border-gray-600/50' : 'bg-gray-50/50 border-gray-200/50'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <Container className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Docker Container
                </span>
              </div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Image: {service.dockerImage}
              </div>
            </div>
          )}

          {/* Host Address (for external services) */}
          {service.hostAddress && (
            <div className="flex items-center justify-between">
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Host:
              </span>
              <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {service.hostAddress}
              </span>
            </div>
          )}

          {/* Port */}
          {service.port && (
            <div className="flex items-center justify-between">
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Port:
              </span>
              <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {service.port}
              </span>
            </div>
          )}

          {/* Health Check URL */}
          {service.healthCheckUrl && (
            <div className="flex items-center justify-between">
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Health Check:
              </span>
              <a
                href={service.healthCheckUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center text-xs ${
                  darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                {service.healthCheckUrl}
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          )}

          {/* Uptime */}
          {service.uptime !== undefined && (
            <div className="flex items-center justify-between">
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Uptime:
              </span>
              <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {Math.round(service.uptime)}%
              </span>
            </div>
          )}

          {/* Last Health Check */}
          {service.lastHealthCheck && (
            <div className="flex items-center justify-between">
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Last checked:
              </span>
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {new Date(service.lastHealthCheck).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={() => onHealthCheck(service)}
            className={`flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              darkMode
                ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400'
                : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
            }`}
          >
            <Activity className="w-3 h-3 mr-1" />
            Check Health
          </button>

          {service.logsAvailable && onViewLogs && (
            <button
              onClick={() => onViewLogs(service)}
              className={`flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                darkMode
                  ? 'bg-green-600/20 hover:bg-green-600/30 text-green-400'
                  : 'bg-green-100 hover:bg-green-200 text-green-700'
              }`}
            >
              <FileText className="w-3 h-3 mr-1" />
              View Logs
            </button>
          )}

          <button
            onClick={() => onDelete(service)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              darkMode
                ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400'
                : 'bg-red-100 hover:bg-red-200 text-red-700'
            }`}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};