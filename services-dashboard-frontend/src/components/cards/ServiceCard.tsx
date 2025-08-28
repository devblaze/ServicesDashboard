import React from 'react';
import { 
  ExternalLink, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  MoreVertical,
  Edit3,
  Trash2,
  PlayCircle,
  Server
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { HostedService } from '../../types/Service.ts';
import { ServiceStatus } from '../../types/ServiceStatus.ts';

interface ServiceCardProps {
  service: HostedService;
  darkMode?: boolean;
  onHealthCheck: (service: HostedService) => void;
  onDelete: (service: HostedService) => void;
  onEdit: (service: HostedService) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  darkMode = true,
  onHealthCheck,
  onDelete,
  onEdit
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStatusIcon = () => {
    switch (service.status) {
      case ServiceStatus.Running:
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case ServiceStatus.Stopped:
        return <XCircle className="w-5 h-5 text-red-400" />;
      case ServiceStatus.Failed:
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default:
        return <Activity className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getStatusColor = () => {
    switch (service.status) {
      case ServiceStatus.Running:
        return 'text-green-400';
      case ServiceStatus.Stopped:
        return 'text-red-400';
      case ServiceStatus.Failed:
        return 'text-red-400';
      default:
        return 'text-yellow-400';
    }
  };

  const getStatusBgColor = () => {
    switch (service.status) {
      case ServiceStatus.Running:
        return darkMode ? 'bg-green-900/30' : 'bg-green-100';
      case ServiceStatus.Stopped:
        return darkMode ? 'bg-red-900/30' : 'bg-red-100';
      case ServiceStatus.Failed:
        return darkMode ? 'bg-red-900/30' : 'bg-red-100';
      default:
        return darkMode ? 'bg-yellow-900/30' : 'bg-yellow-100';
    }
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(service);
    setShowMenu(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(service);
    setShowMenu(false);
  };

  const handleHealthCheckClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onHealthCheck(service);
    setShowMenu(false);
  };

  return (
    <div className={`relative p-6 rounded-xl border transition-all duration-200 hover:shadow-lg ${
      darkMode
        ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
        : 'bg-white border-gray-200 hover:border-gray-300'
    }`}>
      {/* Card Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${getStatusBgColor()}`}>
            {service.isDockerContainer ? (
              <div className="text-lg">🐳</div>
            ) : (
              <Server className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className={`font-semibold text-lg ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {service.name}
            </h3>
            <div className="flex items-center space-x-2">
              <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
                {getStatusIcon()}
                <span className="text-sm font-medium">{service.status}</span>
              </div>
              {service.port && (
                <span className={`text-sm px-2 py-0.5 rounded-full ${
                  darkMode ? 'bg-gray-600/50 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}>
                  :{service.port}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={handleMenuClick}
            className={`p-2 rounded-lg transition-colors ${
              darkMode
                ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className={`absolute right-0 top-full mt-2 py-2 w-48 rounded-lg border shadow-lg z-50 ${
              darkMode 
                ? 'bg-gray-800 border-gray-600' 
                : 'bg-white border-gray-200'
            }`}>
              <button
                onClick={handleEditClick}
                className={`w-full px-4 py-2 text-left flex items-center space-x-2 transition-colors ${
                  darkMode 
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Service</span>
              </button>
              
              <button
                onClick={handleHealthCheckClick}
                className={`w-full px-4 py-2 text-left flex items-center space-x-2 transition-colors ${
                  darkMode 
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <PlayCircle className="w-4 h-4" />
                <span>Check Health</span>
              </button>
              
              <hr className={`my-1 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`} />
              
              <button
                onClick={handleDeleteClick}
                className={`w-full px-4 py-2 text-left flex items-center space-x-2 transition-colors ${
                  darkMode 
                    ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' 
                    : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Service</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Service Description */}
      {service.description && (
        <p className={`text-sm mb-4 ${
          darkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {service.description}
        </p>
      )}

      {/* Service Details */}
      <div className={`space-y-2 text-sm ${
        darkMode ? 'text-gray-400' : 'text-gray-600'
      }`}>
        {service.hostAddress && (
          <div className="flex justify-between">
            <span>Host:</span>
            <span className="font-mono">{service.hostAddress}</span>
          </div>
        )}
        
        {service.dockerImage && (
          <div className="flex justify-between">
            <span>Image:</span>
            <span className="font-mono text-xs">{service.dockerImage}</span>
          </div>
        )}
        
        {service.healthCheckUrl && (
          <div className="flex justify-between items-center">
            <span>Health URL:</span>
            <a
              href={service.healthCheckUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center space-x-1 ${
                darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* Server Connection Indicator */}
      <div className={`mt-4 pt-4 border-t ${
        darkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Server Connection:
          </span>
          <span className={`text-sm font-medium ${
            service.serverId 
              ? darkMode ? 'text-green-400' : 'text-green-600'
              : darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {service.serverId ? 'Connected' : 'Standalone'}
          </span>
        </div>
      </div>
    </div>
  );
};