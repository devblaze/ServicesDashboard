import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  ExternalLink,
  Plus,
  Globe,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Network,
} from 'lucide-react';
import { serverManagementApi } from '../../../services/serverManagementApi';
import type { DockerService, CreateServiceFromDockerRequest } from '../../../services/serverManagementApi';

interface DockerServicesTabProps {
  serverId: number;
  serverHostAddress: string;
  darkMode: boolean;
}

export const DockerServicesTab: React.FC<DockerServicesTabProps> = ({
  serverId,
  serverHostAddress,
  darkMode
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [serviceToAdd, setServiceToAdd] = useState<DockerService | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: dockerData, isLoading, error, refetch } = useQuery({
    queryKey: ['docker-services', serverId],
    queryFn: () => serverManagementApi.getDockerServices(serverId),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const addServiceMutation = useMutation({
    mutationFn: (data: { service: DockerService; request: CreateServiceFromDockerRequest }) =>
      serverManagementApi.addDockerServiceToServices(serverId, data.service.containerId, data.request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setShowAddModal(false);
      setServiceToAdd(null);
    },
  });

  const syncIpsMutation = useMutation({
    mutationFn: () => serverManagementApi.syncDockerIps(serverId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ip-devices'] });
      const message = `✅ Successfully synced ${data.totalContainersScanned} containers!\n` +
        `Created: ${data.devicesCreated} | Updated: ${data.devicesUpdated}\n` +
        `Synced: ${data.syncedContainers.slice(0, 3).join(', ')}${data.syncedContainers.length > 3 ? '...' : ''}`;
      setSyncResult(message);
      setTimeout(() => setSyncResult(null), 8000);
    },
    onError: (error) => {
      const message = `❌ Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setSyncResult(message);
      setTimeout(() => setSyncResult(null), 5000);
    },
  });

  const handleAddService = (service: DockerService) => {
    setServiceToAdd(service);
    setShowAddModal(true);
  };

  const getStatusColor = (status: string) => {
    if (status.toLowerCase().includes('up')) return 'text-green-400';
    if (status.toLowerCase().includes('exited')) return 'text-red-400';
    return 'text-yellow-400';
  };

  const getStatusIcon = (status: string) => {
    if (status.toLowerCase().includes('up')) return <CheckCircle className="w-4 h-4" />;
    if (status.toLowerCase().includes('exited')) return <AlertCircle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  // Generate service URL for containers with exposed web ports
  const generateServiceUrl = (service: DockerService, serverHostAddress: string): string | null => {
    if (!service.status.toLowerCase().includes('up') || service.ports.length === 0) return null;

    // Service-specific port mappings for known services
    const servicePortMap: Record<string, { port: number; protocol: 'http' | 'https' }> = {
      'portainer': { port: 9443, protocol: 'https' },
      'traefik': { port: 8080, protocol: 'http' },
      'nginx': { port: 80, protocol: 'http' },
      'grafana': { port: 3000, protocol: 'http' },
      'prometheus': { port: 9090, protocol: 'http' },
    };

    // Check if this is a known service
    const serviceName = service.image.toLowerCase();
    for (const [key, value] of Object.entries(servicePortMap)) {
      if (serviceName.includes(key)) {
        const matchingPort = service.ports.find(p => p.hostPort === value.port);
        if (matchingPort?.hostPort) {
          return `${value.protocol}://${serverHostAddress}:${matchingPort.hostPort}`;
        }
      }
    }

    // Common web service ports (ordered by priority)
    // HTTPS ports first, then common HTTP ports
    const webPorts = [443, 9443, 8443, 80, 8080, 3000, 5000, 8000, 8888, 9000, 3001, 4000, 5173, 5174];

    // Find the first host port that matches common web service ports
    const webPort = service.ports.find(p =>
      p.hostPort && webPorts.includes(p.hostPort)
    );

    if (webPort?.hostPort) {
      // Use HTTPS for standard HTTPS ports
      const protocol = [443, 9443, 8443].includes(webPort.hostPort) ? 'https' : 'http';
      return `${protocol}://${serverHostAddress}:${webPort.hostPort}`;
    }

    // If no standard web port found, check if any port is exposed on the host
    const firstHostPort = service.ports.find(p => p.hostPort);
    if (firstHostPort?.hostPort) {
      return `http://${serverHostAddress}:${firstHostPort.hostPort}`;
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className={`w-8 h-8 animate-spin ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          <span className={`ml-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Discovering Docker services...
          </span>
        </div>
      </div>
    );
  }

  if (error || !dockerData?.success) {
    return (
      <div className="p-6">
        <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium mb-2">Docker Discovery Failed</p>
          <p className="text-sm mb-4">
            {dockerData?.errorMessage || 'Unable to discover Docker services'}
          </p>
          <button
            onClick={() => refetch()}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              darkMode
                ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400'
                : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
            }`}
          >
            Retry Discovery
          </button>
        </div>
      </div>
    );
  }

  const services = dockerData.services || [];

  return (
    <div className="p-6 space-y-6">
      {/* Sync Result Notification */}
      {syncResult && (
        <div className={`p-4 rounded-lg ${
          syncResult.startsWith('✅')
            ? darkMode
              ? 'bg-green-900/30 border border-green-700/50 text-green-300'
              : 'bg-green-50 border border-green-200 text-green-800'
            : darkMode
              ? 'bg-red-900/30 border border-red-700/50 text-red-300'
              : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <pre className="text-sm whitespace-pre-wrap font-mono">{syncResult}</pre>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Docker Services
          </h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {services.length} containers running
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => syncIpsMutation.mutate()}
            disabled={syncIpsMutation.isPending}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              darkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Sync Docker container IPs to IP Management"
          >
            <Network className={`w-4 h-4 mr-2 ${syncIpsMutation.isPending ? 'animate-spin' : ''}`} />
            {syncIpsMutation.isPending ? 'Syncing...' : 'Sync IPs'}
          </button>
          <button
            onClick={() => refetch()}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              darkMode
                ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {services.length === 0 ? (
        <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <Container className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Docker Services Found</h3>
          <p className="text-sm">
            No running Docker containers were discovered on this server
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {services.map((service) => (
            <div
              key={service.containerId}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                darkMode
                  ? 'bg-gray-700/30 border-gray-600/50 hover:bg-gray-700/50'
                  : 'bg-gray-50/50 border-gray-200/50 hover:bg-gray-100/50'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start space-x-3 flex-1">
                  <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-900/50' : 'bg-blue-100/50'}`}>
                    <Container className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {service.name}
                      </h4>
                      <div className={`flex items-center space-x-1 ${getStatusColor(service.status)}`}>
                        {getStatusIcon(service.status)}
                        <span className="text-xs font-medium">Running</span>
                      </div>
                    </div>
                    
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                      {service.description || service.image}
                    </p>
                    
                    {service.ports.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {service.ports.map((port, index) => (
                          <span
                            key={index}
                            className={`text-xs px-2 py-1 rounded-full ${
                              darkMode ? 'bg-gray-600/50 text-gray-300' : 'bg-gray-200/50 text-gray-600'
                            }`}
                          >
                            {port.hostPort ? `${port.hostPort}:${port.containerPort}` : `${port.containerPort}`}/{port.protocol}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {(() => {
                      const generatedUrl = generateServiceUrl(service, serverHostAddress);
                      const serviceUrl = service.serviceUrl || generatedUrl;

                      if (serviceUrl) {
                        return (
                          <a
                            href={serviceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center text-sm font-medium transition-colors ${
                              darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                            }`}
                          >
                            <Globe className="w-4 h-4 mr-1" />
                            {generatedUrl ? 'Open Service' : serviceUrl}
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
                
                <button
                  onClick={() => handleAddService(service)}
                  className={`flex items-center px-3 py-2 rounded-lg font-medium transition-colors ${
                    darkMode
                      ? 'bg-green-600/20 hover:bg-green-600/30 text-green-400'
                      : 'bg-green-100 hover:bg-green-200 text-green-700'
                  }`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Services
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Service Modal */}
      {showAddModal && serviceToAdd && (
        <AddDockerServiceModal
          service={serviceToAdd}
          darkMode={darkMode}
          onClose={() => {
            setShowAddModal(false);
            setServiceToAdd(null);
          }}
          onAdd={(request) => {
            addServiceMutation.mutate({ service: serviceToAdd, request });
          }}
          isLoading={addServiceMutation.isPending}
        />
      )}
    </div>
  );
};

interface AddDockerServiceModalProps {
  service: DockerService;
  darkMode: boolean;
  onClose: () => void;
  onAdd: (request: CreateServiceFromDockerRequest) => void;
  isLoading: boolean;
}

const AddDockerServiceModal: React.FC<AddDockerServiceModalProps> = ({
  service,
  darkMode,
  onClose,
  onAdd,
  isLoading
}) => {
  const [formData, setFormData] = useState({
    name: service.name,
    description: service.description || `Docker service running ${service.image}`,
    serviceUrl: service.serviceUrl || '',
    port: service.ports.find(p => p.hostPort)?.hostPort || undefined,
    environment: 'production'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      containerId: service.containerId,
      name: formData.name,
      description: formData.description,
      serviceUrl: formData.serviceUrl || undefined,
      port: formData.port,
      environment: formData.environment
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-md rounded-2xl border backdrop-blur-sm ${
        darkMode 
          ? 'bg-gray-800/95 border-gray-700/50' 
          : 'bg-white/95 border-gray-200/50'
      }`}>
        <div className="p-6">
          <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Add Docker Service
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Service Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700/50 border-gray-600/50 text-white'
                    : 'bg-white/50 border-gray-300/50 text-gray-900'
                } focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50`}
                required
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700/50 border-gray-600/50 text-white'
                    : 'bg-white/50 border-gray-300/50 text-gray-900'
                } focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50`}
                rows={3}
              />
            </div>
            
            {formData.serviceUrl && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Service URL
                </label>
                <input
                  type="url"
                  value={formData.serviceUrl}
                  onChange={(e) => setFormData({ ...formData, serviceUrl: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    darkMode
                      ? 'bg-gray-700/50 border-gray-600/50 text-white'
                      : 'bg-white/50 border-gray-300/50 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50`}
                />
              </div>
            )}
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Environment
              </label>
              <select
                value={formData.environment}
                onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700/50 border-gray-600/50 text-white'
                    : 'bg-white/50 border-gray-300/50 text-gray-900'
                } focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50`}
              >
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  darkMode
                    ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  darkMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading ? 'Adding...' : 'Add Service'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};