import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Search,
  ArrowUpDown,
  Play,
  Square,
  RotateCcw,
  Server,
  Clock,
  Tag,
  Grip,
  Layers,
  Upload,
  X
} from 'lucide-react';
import { dockerServicesApi } from '../../services/DockerServicesApi.ts';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult, DroppableProvided, DraggableProvided } from '@hello-pangea/dnd';

interface DockerService {
  containerId: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: Array<{
    privatePort: number;
    publicPort?: number;
    type: string;
    ip?: string; // Added ip field to match API response
  }>;
  createdAt: string;
  serverId: number;
  serverName: string;
  serverHostAddress: string;
  order: number;
  customIconUrl?: string;
  customIconData?: string;
  statusColor: string;
  isRunning: boolean;
  displayImage: string;
  imageTag: string;
}

interface DockerServicesProps {
  darkMode: boolean;
}

export function DockerServices({ darkMode }: DockerServicesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serverFilter, setServerFilter] = useState<string>('all');
  const [isArranging, setIsArranging] = useState(false);
  const [arrangedServices, setArrangedServices] = useState<DockerService[]>([]);
  const [groupByServer, setGroupByServer] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<DockerService | null>(null);
  const [iconUrl, setIconUrl] = useState('');
  const [removeBackground, setRemoveBackground] = useState(false);
  const [downloadFromUrl, setDownloadFromUrl] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const queryClient = useQueryClient();

  const { data: services = [], isLoading, refetch, error } = useQuery({
    queryKey: ['docker-services'],
    queryFn: dockerServicesApi.getAllDockerServices,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fix the infinite loop by using useMemo and a stable dependency
  const servicesString = useMemo(() => JSON.stringify(services), [services]);
  
  useEffect(() => {
    if (services && services.length > 0) {
      setArrangedServices(services);
    }
  }, [servicesString]); // Use servicesString instead of services directly

  const updateArrangementsMutation = useMutation({
    mutationFn: dockerServicesApi.updateArrangements,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docker-services'] });
      setIsArranging(false);
    },
  });

  const startContainerMutation = useMutation({
    mutationFn: ({ serverId, containerId }: { serverId: number; containerId: string }) =>
      dockerServicesApi.startContainer(serverId, containerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docker-services'] });
    },
  });

  const stopContainerMutation = useMutation({
    mutationFn: ({ serverId, containerId }: { serverId: number; containerId: string }) =>
      dockerServicesApi.stopContainer(serverId, containerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docker-services'] });
    },
  });

  const restartContainerMutation = useMutation({
    mutationFn: ({ serverId, containerId }: { serverId: number; containerId: string }) =>
      dockerServicesApi.restartContainer(serverId, containerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docker-services'] });
    },
  });

  const updateIconMutation = useMutation({
    mutationFn: ({
      serverId,
      containerId,
      iconUrl,
      iconData,
      removeBackground,
      downloadFromUrl
    }: {
      serverId: number;
      containerId: string;
      iconUrl?: string;
      iconData?: string;
      removeBackground?: boolean;
      downloadFromUrl?: boolean;
    }) =>
      dockerServicesApi.updateServiceIcon(serverId, containerId, iconUrl, iconData, removeBackground, downloadFromUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docker-services'] });
      setUploadError(null);
      setUploadSuccess(true);

      // Close modal after showing success message briefly
      setTimeout(() => {
        setUploadModalOpen(false);
        setSelectedService(null);
        setIconUrl('');
        setRemoveBackground(false);
        setDownloadFromUrl(false);
        setUploadSuccess(false);
      }, 1500);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to update icon';
      setUploadError(errorMessage);
      setUploadSuccess(false);
    },
  });

  const filteredServices = useMemo(() => {
    return arrangedServices
      .filter(service => {
        const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             service.image.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             service.serverName.toLowerCase().includes(searchTerm.toLowerCase());

        // Fix status filter to check isRunning property instead of exact status match
        const matchesStatus = statusFilter === 'all' ||
                             (statusFilter === 'running' && service.isRunning) ||
                             (statusFilter === 'stopped' && !service.isRunning);
        const matchesServer = serverFilter === 'all' || service.serverId.toString() === serverFilter;

        return matchesSearch && matchesStatus && matchesServer;
      })
      .sort((a, b) => {
        // Sort by running status first (running containers on top)
        if (a.isRunning !== b.isRunning) {
          return a.isRunning ? -1 : 1;
        }
        // Then by order
        return a.order - b.order;
      });
  }, [arrangedServices, searchTerm, statusFilter, serverFilter]);

  const uniqueServers = useMemo(() => {
    const serverMap = new Map<number, string>();
    services.forEach(s => {
      if (!serverMap.has(s.serverId)) {
        serverMap.set(s.serverId, s.serverName);
      }
    });
    return Array.from(serverMap, ([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [services]);

  // Group services by server
  const groupedServices = useMemo(() => {
    if (!groupByServer) return null;

    const groups = new Map<number, { serverName: string; serverHostAddress: string; services: DockerService[] }>();

    filteredServices.forEach(service => {
      if (!groups.has(service.serverId)) {
        groups.set(service.serverId, {
          serverName: service.serverName,
          serverHostAddress: service.serverHostAddress,
          services: []
        });
      }
      groups.get(service.serverId)!.services.push(service);
    });

    // Sort groups by server name
    return Array.from(groups.entries())
      .sort((a, b) => a[1].serverName.localeCompare(b[1].serverName))
      .map(([serverId, data]) => ({
        serverId,
        ...data,
        runningCount: data.services.filter(s => s.isRunning).length,
        stoppedCount: data.services.filter(s => !s.isRunning).length
      }));
  }, [filteredServices, groupByServer]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(arrangedServices);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order values
    const updatedItems = items.map((item, index) => ({ ...item, order: index }));
    setArrangedServices(updatedItems);
  };

  const saveArrangement = () => {
    const arrangements = arrangedServices.map((service, index) => ({
      serverId: service.serverId,
      containerId: service.containerId,
      containerName: service.name,
      order: index
    }));

    updateArrangementsMutation.mutate(arrangements);
  };

  const handleRefreshClick = () => {
    refetch();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (selectedService) {
        updateIconMutation.mutate({
          serverId: selectedService.serverId,
          containerId: selectedService.containerId,
          iconData: base64String,
          removeBackground: removeBackground
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleIconUrlSubmit = () => {
    if (selectedService && iconUrl.trim()) {
      updateIconMutation.mutate({
        serverId: selectedService.serverId,
        containerId: selectedService.containerId,
        iconUrl: iconUrl.trim(),
        removeBackground: removeBackground,
        downloadFromUrl: downloadFromUrl
      });
    }
  };

  const openUploadModal = (service: DockerService) => {
    setSelectedService(service);
    setUploadModalOpen(true);
  };

  const closeUploadModal = () => {
    if (updateIconMutation.isPending) return; // Prevent closing during upload
    setUploadModalOpen(false);
    setSelectedService(null);
    setIconUrl('');
    setRemoveBackground(false);
    setDownloadFromUrl(false);
    setUploadError(null);
    setUploadSuccess(false);
  };

  // Handle ESC key to close modal
  useEscapeKey(closeUploadModal, uploadModalOpen && !updateIconMutation.isPending);

  const getContainerIcon = (imageName: string): string => {
    // Extract the repository name from the image
    const parts = imageName.split('/');
    let repo = '';

    if (parts.length === 1) {
      // Official image like "nginx:latest"
      repo = parts[0].split(':')[0];
    } else if (parts.length === 2 && !parts[0].includes('.')) {
      // Format like "library/redis" or "user/repo"
      repo = parts[1].split(':')[0];
    } else {
      // Custom registry or complex format - use last part
      repo = parts[parts.length - 1].split(':')[0];
    }

    // Use simple-icons CDN for popular services
    // Map common container names to their logo equivalents
    const iconMap: { [key: string]: string } = {
      'nginx': 'nginx',
      'redis': 'redis',
      'postgres': 'postgresql',
      'postgresql': 'postgresql',
      'mysql': 'mysql',
      'mongo': 'mongodb',
      'mongodb': 'mongodb',
      'elasticsearch': 'elasticsearch',
      'rabbitmq': 'rabbitmq',
      'node': 'nodedotjs',
      'python': 'python',
      'grafana': 'grafana',
      'prometheus': 'prometheus',
      'traefik': 'traefik',
      'portainer': 'portainer',
      'sonarqube': 'sonarqube',
      'jenkins': 'jenkins',
      'gitlab': 'gitlab',
      'nextcloud': 'nextcloud',
      'wordpress': 'wordpress',
      'mariadb': 'mariadb',
      'influxdb': 'influxdb',
      'minio': 'minio',
    };

    const iconName = iconMap[repo.toLowerCase()] || repo.toLowerCase();

    // Use simple-icons CDN with a fallback
    return `https://cdn.simpleicons.org/${iconName}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />;
      case 'exited':
        return <div className="w-2 h-2 bg-red-400 rounded-full" />;
      case 'paused':
        return <div className="w-2 h-2 bg-yellow-400 rounded-full" />;
      case 'restarting':
        return <div className="w-2 h-2 bg-blue-400 rounded-full animate-spin" />;
      default:
        return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
    }
  };

  const renderServiceCard = (service: DockerService, hideServerInfo = false) => (
    <div
      key={service.containerId}
      className={`p-6 rounded-xl shadow-sm border-2 transition-all duration-200 ${
        service.isRunning
          ? darkMode
            ? 'bg-gray-800/50 border-green-500/30 hover:bg-gray-800/70 hover:border-green-500/50'
            : 'bg-white border-green-200 hover:shadow-md hover:border-green-300'
          : darkMode
            ? 'bg-gray-800/30 border-gray-700/30 hover:bg-gray-800/50'
            : 'bg-gray-50 border-gray-200 hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-3">
            {isArranging && (
              <Grip className={`w-4 h-4 cursor-grab ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            )}

            {/* Container Icon */}
            {service.customIconData ? (
              <img
                src={service.customIconData}
                alt={service.name}
                className="w-10 h-10 rounded object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : service.customIconUrl ? (
              <img
                src={service.customIconUrl}
                alt={service.name}
                className="w-10 h-10 rounded object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : (
              <img
                src={getContainerIcon(service.image)}
                alt={service.displayImage}
                className="w-10 h-10 rounded object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            )}
            <Container className={`w-8 h-8 hidden ${
              service.isRunning
                ? darkMode ? 'text-green-400' : 'text-green-600'
                : darkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />

            <div>
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {service.name}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                {getStatusIcon(service.status)}
                <span className={`text-sm font-medium capitalize px-2 py-0.5 rounded ${
                  service.isRunning
                    ? darkMode
                      ? 'text-green-400 bg-green-900/30'
                      : 'text-green-700 bg-green-100'
                    : darkMode
                      ? 'text-red-400 bg-red-900/30'
                      : 'text-red-700 bg-red-100'
                }`}>
                  {service.status}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center space-x-2">
              <Tag className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {service.displayImage}
                <span className={`ml-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  :{service.imageTag}
                </span>
              </span>
            </div>

            {!hideServerInfo && (
              <div className="flex items-center space-x-2">
                <Server className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {service.serverName} ({service.serverHostAddress})
                </span>
              </div>
            )}

            {service.ports.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Ports:
                </span>
                <div className="flex space-x-1">
                  {service.ports.slice(0, 3).map((port, i) => (
                    <span
                      key={i}
                      className={`px-2 py-1 text-xs rounded ${
                        darkMode
                          ? 'bg-gray-700 text-gray-300'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {port.publicPort ? `${port.publicPort}:${port.privatePort}` : port.privatePort}
                    </span>
                  ))}
                  {service.ports.length > 3 && (
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      +{service.ports.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Clock className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Created {new Date(service.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {!isArranging && (
          <div className="flex flex-col space-y-2">
            <div className="flex space-x-2">
              {service.isRunning ? (
                <>
                  <button
                    onClick={() => stopContainerMutation.mutate({
                      serverId: service.serverId,
                      containerId: service.containerId
                    })}
                    disabled={stopContainerMutation.isPending}
                    className={`p-2 rounded-lg transition-colors ${
                      darkMode
                        ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400'
                        : 'bg-red-100 hover:bg-red-200 text-red-600'
                    }`}
                    title="Stop Container"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => restartContainerMutation.mutate({
                      serverId: service.serverId,
                      containerId: service.containerId
                    })}
                    disabled={restartContainerMutation.isPending}
                    className={`p-2 rounded-lg transition-colors ${
                      darkMode
                        ? 'bg-blue-900/30 hover:bg-blue-900/50 text-blue-400'
                        : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
                    }`}
                    title="Restart Container"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => startContainerMutation.mutate({
                    serverId: service.serverId,
                    containerId: service.containerId
                  })}
                  disabled={startContainerMutation.isPending}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode
                      ? 'bg-green-900/30 hover:bg-green-900/50 text-green-400'
                      : 'bg-green-100 hover:bg-green-200 text-green-600'
                  }`}
                  title="Start Container"
                >
                  <Play className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => openUploadModal(service)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode
                  ? 'bg-purple-900/30 hover:bg-purple-900/50 text-purple-400'
                  : 'bg-purple-100 hover:bg-purple-200 text-purple-600'
              }`}
              title="Upload Custom Icon"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Debug logging
  console.log('Docker Services Debug:', {
    servicesLength: services?.length || 0,
    arrangedServicesLength: arrangedServices.length,
    filteredServicesLength: filteredServices.length,
    isLoading,
    error: error?.message
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Docker Services
          </h1>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage Docker containers across all connected servers
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefreshClick}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg transition-colors ${
              darkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            Refresh
          </button>
          
          {isArranging ? (
            <div className="flex space-x-2">
              <button
                onClick={saveArrangement}
                disabled={updateArrangementsMutation.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsArranging(false);
                  setArrangedServices(services);
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsArranging(true)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>Arrange</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              placeholder="Search containers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-800/50 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`px-3 py-2 rounded-lg border ${
            darkMode
              ? 'bg-gray-800/50 border-gray-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <option value="all">All Containers</option>
          <option value="running">Running Only</option>
          <option value="stopped">Stopped Only</option>
        </select>

        <select
          value={serverFilter}
          onChange={(e) => setServerFilter(e.target.value)}
          className={`px-3 py-2 rounded-lg border ${
            darkMode
              ? 'bg-gray-800/50 border-gray-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <option value="all">All Servers</option>
          {uniqueServers.map(server => (
            <option key={server.id} value={server.id}>{server.name}</option>
          ))}
        </select>

        <button
          onClick={() => setGroupByServer(!groupByServer)}
          className={`px-4 py-2 rounded-lg border flex items-center space-x-2 transition-colors ${
            groupByServer
              ? darkMode
                ? 'bg-blue-900/30 border-blue-600/50 text-blue-400'
                : 'bg-blue-50 border-blue-300 text-blue-700'
              : darkMode
                ? 'bg-gray-800/50 border-gray-600 text-gray-300'
                : 'bg-white border-gray-300 text-gray-700'
          }`}
          title={groupByServer ? 'Grouped by server' : 'Not grouped'}
        >
          <Layers className="w-4 h-4" />
          <span>Group by Server</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className={`p-4 rounded-lg border ${
          darkMode
            ? 'bg-red-900/20 border-red-600/50 text-red-400'
            : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          <p>Error loading Docker services: {error.message}</p>
          <button
            onClick={() => refetch()}
            className={`mt-2 px-3 py-1 text-sm rounded ${
              darkMode
                ? 'bg-red-800/50 hover:bg-red-700/50'
                : 'bg-red-100 hover:bg-red-200'
            }`}
          >
            Retry
          </button>
        </div>
      )}

      {/* Services Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
            darkMode ? 'border-blue-400' : 'border-blue-600'
          }`} />
        </div>
      ) : filteredServices.length === 0 && services.length === 0 ? (
        <div className={`text-center py-12 ${
          darkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          <Container className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No Docker services found</p>
          <p className="text-sm mt-2">
            Make sure your servers are properly configured and have Docker containers running.
          </p>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className={`text-center py-12 ${
          darkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          <Container className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No services match your current filters</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setServerFilter('all');
            }}
            className={`mt-3 px-4 py-2 rounded-lg transition-colors ${
              darkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            Clear Filters
          </button>
        </div>
      ) : isArranging ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="services">
            {(provided: DroppableProvided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              >
                {filteredServices.map((service, index) => (
                  <Draggable
                    key={service.containerId}
                    draggableId={service.containerId}
                    index={index}
                  >
                    {(provided: DraggableProvided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        {renderServiceCard(service)}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : groupByServer && groupedServices ? (
        <div className="space-y-8">
          {groupedServices.map((group) => (
            <div key={group.serverId} className="space-y-4">
              <div className={`flex items-center justify-between p-4 rounded-lg ${
                darkMode
                  ? 'bg-gray-800/30 border border-gray-700/50'
                  : 'bg-gray-50 border border-gray-200'
              }`}>
                <div className="flex items-center space-x-3">
                  <Server className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  <div>
                    <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {group.serverName}
                    </h2>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {group.serverHostAddress}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {group.runningCount} running
                    </span>
                  </div>
                  {group.stoppedCount > 0 && (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {group.stoppedCount} stopped
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {group.services.map((service) => renderServiceCard(service, true))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => renderServiceCard(service))}
        </div>
      )}

      {/* Stats */}
      {services.length > 0 && (
        <div className={`text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Showing {filteredServices.length} of {services.length} containers
          {services.filter(s => s.isRunning).length > 0 && (
            <span className="ml-4">
              {services.filter(s => s.isRunning).length} running
            </span>
          )}
        </div>
      )}

      {/* Icon Upload Modal */}
      {uploadModalOpen && selectedService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`rounded-lg shadow-xl max-w-md w-full mx-4 ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className={`flex items-center justify-between p-6 border-b ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Upload Icon for {selectedService.name}
              </h3>
              <button
                onClick={closeUploadModal}
                disabled={updateIconMutation.isPending}
                className={`p-1 rounded-lg transition-colors ${
                  darkMode
                    ? 'hover:bg-gray-700 text-gray-400'
                    : 'hover:bg-gray-100 text-gray-500'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* File Upload */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Upload Custom Icon
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Upload a custom icon image (PNG, JPG, etc.)
                </p>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className={`absolute inset-0 flex items-center ${darkMode ? 'opacity-50' : ''}`}>
                  <div className={`w-full border-t ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className={`px-2 ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>
                    Or
                  </span>
                </div>
              </div>

              {/* URL Input */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Enter Icon URL
                </label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={iconUrl}
                    onChange={(e) => setIconUrl(e.target.value)}
                    placeholder="https://example.com/icon.png"
                    className={`flex-1 px-3 py-2 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                  <button
                    onClick={handleIconUrlSubmit}
                    disabled={!iconUrl.trim() || updateIconMutation.isPending}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      !iconUrl.trim() || updateIconMutation.isPending
                        ? darkMode
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    Set
                  </button>
                </div>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Provide a direct URL to an icon image
                </p>
              </div>

              {/* Options */}
              <div className={`space-y-3 p-4 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700/30 border-gray-600/50'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <h4 className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  Processing Options
                </h4>

                {/* Remove Background Checkbox */}
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={removeBackground}
                    onChange={(e) => setRemoveBackground(e.target.checked)}
                    className="mt-0.5 rounded border-gray-400 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      Remove background
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Automatically removes solid background colors from the image
                    </div>
                  </div>
                </label>

                {/* Download from URL Checkbox */}
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={downloadFromUrl}
                    onChange={(e) => setDownloadFromUrl(e.target.checked)}
                    disabled={!iconUrl.trim()}
                    className="mt-0.5 rounded border-gray-400 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'} ${!iconUrl.trim() ? 'opacity-50' : ''}`}>
                      Download and store image
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} ${!iconUrl.trim() ? 'opacity-50' : ''}`}>
                      Downloads the image from URL and stores it (recommended for external URLs)
                    </div>
                  </div>
                </label>
              </div>

              {/* Loading State */}
              {updateIconMutation.isPending && (
                <div className="flex items-center justify-center py-4">
                  <div className={`animate-spin rounded-full h-6 w-6 border-b-2 ${
                    darkMode ? 'border-blue-400' : 'border-blue-600'
                  }`} />
                  <span className={`ml-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {downloadFromUrl ? 'Downloading and processing...' : 'Uploading...'}
                  </span>
                </div>
              )}

              {/* Success Message */}
              {uploadSuccess && (
                <div className={`p-3 rounded-lg border ${
                  darkMode
                    ? 'bg-green-900/20 border-green-600/50 text-green-300'
                    : 'bg-green-50 border-green-200 text-green-700'
                }`}>
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm font-medium">Icon updated successfully!</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {uploadError && (
                <div className={`p-3 rounded-lg border ${
                  darkMode
                    ? 'bg-red-900/20 border-red-600/50 text-red-300'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Failed to update icon</p>
                      <p className="text-xs mt-1">{uploadError}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}