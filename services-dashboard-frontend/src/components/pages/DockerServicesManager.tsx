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
  Grip
} from 'lucide-react';
import { dockerServicesApi } from '../../services/DockerServicesApi.ts';
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

  const filteredServices = useMemo(() => {
    return arrangedServices
      .filter(service => {
        // Filter out exited containers by default (unless explicitly filtered for)
        if (statusFilter === 'all' && service.status.toLowerCase() === 'exited') {
          return false;
        }

        const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             service.image.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             service.serverName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || service.status.toLowerCase() === statusFilter.toLowerCase();
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

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(services.map(s => s.status)))
      .sort();
  }, [services]);

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

  const renderServiceCard = (service: DockerService) => (
    <div
      key={service.containerId}
      className={`p-6 rounded-xl shadow-sm border transition-all duration-200 ${
        darkMode
          ? 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800/70'
          : 'bg-white border-gray-200 hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-3">
            {isArranging && (
              <Grip className={`w-4 h-4 cursor-grab ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            )}
            <Container className={`w-5 h-5 ${
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
                <span className={`text-sm capitalize ${
                  darkMode ? 'text-gray-300' : 'text-gray-600'
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
            
            <div className="flex items-center space-x-2">
              <Server className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {service.serverName} ({service.serverHostAddress})
              </span>
            </div>

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
          <option value="all">Active Containers</option>
          <option value="running">Running</option>
          <option value="exited">Stopped</option>
          {uniqueStatuses
            .filter(status => status.toLowerCase() !== 'running' && status.toLowerCase() !== 'exited')
            .map(status => (
              <option key={status} value={status}>{status}</option>
            ))
          }
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
    </div>
  );
}