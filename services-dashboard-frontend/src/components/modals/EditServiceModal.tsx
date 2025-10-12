import React, { useEffect, useState } from 'react';
import { X, HelpCircle, AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react';
import { ServerDropdown } from '../networkDiscovery/ServerDropdown.tsx';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/servicesApi.ts';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import type { HostedService } from '../../types/Service.ts';
import type { ServerSummary } from '../../services/servicesApi.ts';

interface EditFormData {
  name: string;
  description: string;
  port?: number;
  dockerImage?: string;
  serviceUrl?: string;
  containerId?: string;
  serverId?: number;
  hostAddress?: string;
  isDockerContainer: boolean;
}

interface EditServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<HostedService>) => void;
  service: HostedService;
  formData: EditFormData;
  onFormDataChange: (data: Partial<EditFormData>) => void;
  isLoading?: boolean;
  darkMode?: boolean;
}

interface ServerRecommendation {
  server: ServerSummary;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

export const EditServiceModal: React.FC<EditServiceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  service,
  formData,
  onFormDataChange,
  isLoading = false,
  darkMode = true
}) => {
  const [recommendations, setRecommendations] = useState<ServerRecommendation[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);

  // Get available servers for recommendations
  const { data: servers = [] } = useQuery({
    queryKey: ['servers-for-services'],
    queryFn: async (): Promise<ServerSummary[]> => {
      try {
        return await apiClient.getServersForServices();
      } catch {
        // Fallback to mock data
        return [
          { id: 1, name: 'Production Server', hostAddress: '192.168.1.100', status: 'Online', type: 'VirtualMachine' },
          { id: 2, name: 'Development Server', hostAddress: '192.168.1.101', status: 'Warning', type: 'RaspberryPi' },
          { id: 3, name: 'Docker Host', hostAddress: '192.168.1.102', status: 'Online', type: 'Container' },
        ];
      }
    },
    enabled: isOpen,
  });

  // Generate server recommendations based on IP matching and other criteria
  useEffect(() => {
    if (!isOpen || !servers.length || !formData.hostAddress) return;

    const recs: ServerRecommendation[] = [];
    
    servers.forEach(server => {
      // IP matching recommendation
      if (formData.hostAddress === server.hostAddress) {
        recs.push({
          server,
          reason: `Exact IP match (${server.hostAddress})`,
          confidence: 'high'
        });
      }
      // Same subnet recommendation
      else if (formData.hostAddress && isInSameSubnet(formData.hostAddress, server.hostAddress)) {
        recs.push({
          server,
          reason: `Same subnet as ${server.hostAddress}`,
          confidence: 'medium'
        });
      }
      // Docker service on container server
      else if (formData.isDockerContainer && server.type.toLowerCase().includes('container')) {
        recs.push({
          server,
          reason: 'Docker service matches container server type',
          confidence: 'medium'
        });
      }
      // Online server recommendation
      else if (server.status.toLowerCase() === 'online' && !formData.serverId) {
        recs.push({
          server,
          reason: 'Available online server',
          confidence: 'low'
        });
      }
    });

    // Sort by confidence and limit to top 3
    recs.sort((a, b) => {
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
    });

    setRecommendations(recs.slice(0, 3));
    setShowRecommendations(recs.length > 0);
  }, [isOpen, servers, formData.hostAddress, formData.isDockerContainer, formData.serverId]);

  const isInSameSubnet = (ip1: string, ip2: string): boolean => {
    const subnet1 = ip1.split('.').slice(0, 3).join('.');
    const subnet2 = ip2.split('.').slice(0, 3).join('.');
    return subnet1 === subnet2;
  };

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checkedValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    onFormDataChange({
      [name]: name === 'port' ? (value ? parseInt(value) : undefined) : checkedValue
    });
  };

  const handleServerSelect = (serverId: number | undefined) => {
    onFormDataChange({ serverId });
    if (serverId) {
      setShowRecommendations(false);
    }
  };

  const handleRecommendationSelect = (recommendation: ServerRecommendation) => {
    onFormDataChange({ serverId: recommendation.server.id });
    setShowRecommendations(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updateData: Partial<HostedService> = {
      name: formData.name,
      description: formData.description,
      port: formData.port,
      dockerImage: formData.dockerImage,
      healthCheckUrl: formData.serviceUrl,
      isDockerContainer: formData.isDockerContainer,
      serverId: formData.serverId,
      containerId: formData.containerId,
      hostAddress: formData.hostAddress,
    };
    onSubmit(updateData);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getConfidenceColor = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return darkMode ? 'text-green-400 bg-green-900/20' : 'text-green-600 bg-green-100';
      case 'medium':
        return darkMode ? 'text-yellow-400 bg-yellow-900/20' : 'text-yellow-600 bg-yellow-100';
      case 'low':
        return darkMode ? 'text-blue-400 bg-blue-900/20' : 'text-blue-600 bg-blue-100';
    }
  };

  const getConfidenceIcon = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return <CheckCircle className="w-4 h-4" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4" />;
      case 'low':
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  // Handle ESC key to close modal
  useEscapeKey(onClose, isOpen && !isLoading);

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]"
      onClick={handleBackdropClick}
    >
      <div className={`w-full max-w-3xl rounded-xl border shadow-xl max-h-[90vh] overflow-y-auto ${
        darkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        {/* Modal Header */}
        <div className={`p-6 border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-xl font-semibold ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Edit Service: {service.name}
            </h3>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                darkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Server Recommendations Banner */}
        {showRecommendations && recommendations.length > 0 && (
          <div className={`p-4 border-b ${
            darkMode ? 'bg-blue-900/10 border-gray-700' : 'bg-blue-50 border-gray-200'
          }`}>
            <div className="flex items-start space-x-3">
              <Lightbulb className={`w-5 h-5 mt-0.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <div className="flex-1">
                <h4 className={`font-medium ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                  Server Recommendations
                </h4>
                <p className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'} mb-3`}>
                  We found servers that might host this service:
                </p>
                <div className="space-y-2">
                  {recommendations.map((rec, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecommendationSelect(rec)}
                      className={`flex items-center justify-between w-full p-3 rounded-lg border transition-colors ${
                        darkMode
                          ? 'border-gray-600 hover:border-blue-500 bg-gray-700/50 hover:bg-gray-700'
                          : 'border-gray-200 hover:border-blue-300 bg-white hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">
                          {rec.server.type.toLowerCase().includes('raspberry') ? '🥧' :
                           rec.server.type.toLowerCase().includes('virtual') ? '💻' :
                           rec.server.type.toLowerCase().includes('container') ? '📦' : '🖥️'}
                        </span>
                        <div className="text-left">
                          <div className="font-medium">{rec.server.name}</div>
                          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {rec.reason}
                          </div>
                        </div>
                      </div>
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${getConfidenceColor(rec.confidence)}`}>
                        {getConfidenceIcon(rec.confidence)}
                        <span className="capitalize">{rec.confidence}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowRecommendations(false)}
                  className={`text-sm mt-2 ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  Dismiss recommendations
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Body - Rest of the form remains the same */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* ... rest of the form JSX remains exactly the same ... */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Service Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="My Service"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Port
              </label>
              <input
                type="number"
                name="port"
                value={formData.port || ''}
                onChange={handleInputChange}
                min="1"
                max="65535"
                className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="80"
              />
            </div>
          </div>

          {/* Host Address (read-only for discovery context) */}
          {formData.hostAddress && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Host Address
              </label>
              <input
                type="text"
                value={formData.hostAddress}
                readOnly
                className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                  darkMode
                    ? 'bg-gray-600 border-gray-600 text-gray-300'
                    : 'bg-gray-100 border-gray-300 text-gray-600'
                }`}
              />
            </div>
          )}

          {/* Server Selection with enhanced dropdown */}
          <ServerDropdown
            selectedServerId={formData.serverId}
            onServerSelect={handleServerSelect}
            darkMode={darkMode}
            placeholder="Select server to connect this service"
          />

          {/* Docker Service Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isDockerContainer"
              name="isDockerContainer"
              checked={formData.isDockerContainer}
              onChange={handleInputChange}
              className="rounded"
            />
            <label htmlFor="isDockerContainer" className={`text-sm font-medium ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              This is a Docker container service
            </label>
          </div>

          {/* Docker-specific fields */}
          {formData.isDockerContainer && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`flex items-center text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Docker Image
                  <div className="group relative ml-1">
                    <HelpCircle className="w-4 h-4 text-gray-400" />
                    <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 ${
                      darkMode ? 'bg-gray-900 text-white' : 'bg-gray-800 text-white'
                    }`}>
                      e.g., nginx:latest, node:18-alpine
                    </div>
                  </div>
                </label>
                <input
                  type="text"
                  name="dockerImage"
                  value={formData.dockerImage || ''}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  placeholder="nginx:latest"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Container ID
                </label>
                <input
                  type="text"
                  name="containerId"
                  value={formData.containerId || ''}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  placeholder="abc123def456..."
                />
              </div>
            </div>
          )}

          {/* Service URL */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Service URL
            </label>
            <input
              type="url"
              name="serviceUrl"
              value={formData.serviceUrl || ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              placeholder="https://myservice.com"
            />
          </div>

          {/* Description */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              placeholder="Brief description of the service..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.name || isLoading}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                formData.name && !isLoading
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};