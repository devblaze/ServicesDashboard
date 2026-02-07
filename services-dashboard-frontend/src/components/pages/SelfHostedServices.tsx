import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Server,
  Container,
  GitBranch,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Play,
  Square,
  RotateCw,
  Settings,
  ExternalLink,
  Clock,
  Zap,
  Loader2,
  X,
  Github,
  GitBranchPlus,
  Upload
} from 'lucide-react';
import type { SelfHostedService } from '../../types/SelfHostedService';
import { getAllSelfHostedServices } from '../../services/selfHostedServices';
import { dockerServicesApi } from '../../services/DockerServicesApi';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface SelfHostedServicesProps {
  darkMode?: boolean;
}

export const SelfHostedServices: React.FC<SelfHostedServicesProps> = ({ darkMode = true }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'docker' | 'deployment'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Icon upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<SelfHostedService | null>(null);
  const [iconUrl, setIconUrl] = useState('');
  const [removeBackground, setRemoveBackground] = useState(false);
  const [downloadFromUrl, setDownloadFromUrl] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Fetch services using React Query
  const { data: servicesResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['selfHostedServices', viewMode, statusFilter, searchTerm],
    queryFn: () => getAllSelfHostedServices({
      type: viewMode === 'all' ? undefined : (viewMode === 'docker' ? 'DockerContainer' : 'Deployment'),
      status: statusFilter === 'all' ? undefined : statusFilter,
      searchTerm: searchTerm || undefined,
    }),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const services = servicesResponse?.services || [];

  // Icon update mutation
  const updateIconMutation = useMutation({
    mutationFn: ({
      serverId,
      containerId,
      iconUrl,
      iconData,
      removeBackground,
      downloadFromUrl,
      imageName
    }: {
      serverId: number;
      containerId: string;
      iconUrl?: string;
      iconData?: string;
      removeBackground?: boolean;
      downloadFromUrl?: boolean;
      imageName?: string;
    }) =>
      dockerServicesApi.updateServiceIcon(serverId, containerId, iconUrl, iconData, removeBackground, downloadFromUrl, imageName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selfHostedServices'] });
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to update icon';
      setUploadError(errorMessage);
      setUploadSuccess(false);
    },
  });

  // Get auto-detected container icon from simple-icons CDN
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
    return `https://cdn.simpleicons.org/${iconName}`;
  };

  const getServiceIcon = (service: SelfHostedService) => {
    if (service.type === 'DockerContainer' && service.image) {
      // Render custom icon data (base64 or stored image)
      if (service.customIconData) {
        return (
          <img
            src={service.customIconData}
            alt={service.name}
            className="w-10 h-10 rounded object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) fallback.classList.remove('hidden');
            }}
          />
        );
      }

      // Render icon from URL
      if (service.iconUrl) {
        return (
          <>
            <img
              src={service.iconUrl}
              alt={service.name}
              className="w-10 h-10 rounded object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.classList.remove('hidden');
              }}
            />
            <img
              src={getContainerIcon(service.image)}
              alt={service.name}
              className="w-10 h-10 rounded object-cover hidden"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.classList.remove('hidden');
              }}
            />
          </>
        );
      }

      // Auto-detect icon based on image name
      return (
        <>
          <img
            src={getContainerIcon(service.image)}
            alt={service.name}
            className="w-10 h-10 rounded object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) fallback.classList.remove('hidden');
            }}
          />
          <Container className="w-8 h-8 hidden" />
        </>
      );
    }

    // Default icons for deployments
    if (service.type === 'Deployment') {
      return <GitBranch className="w-5 h-5" />;
    }

    return <Container className="w-5 h-5" />;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (selectedService && selectedService.containerId) {
        updateIconMutation.mutate({
          serverId: selectedService.serverId,
          containerId: selectedService.containerId,
          iconData: base64String,
          removeBackground: removeBackground,
          imageName: selectedService.image
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleIconUrlSubmit = () => {
    if (selectedService && iconUrl.trim() && selectedService.containerId) {
      updateIconMutation.mutate({
        serverId: selectedService.serverId,
        containerId: selectedService.containerId,
        iconUrl: iconUrl.trim(),
        removeBackground: removeBackground,
        downloadFromUrl: downloadFromUrl,
        imageName: selectedService.image
      });
    }
  };

  const openUploadModal = (service: SelfHostedService) => {
    setSelectedService(service);
    setUploadModalOpen(true);
  };

  const closeUploadModal = () => {
    if (updateIconMutation.isPending) return;
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return darkMode ? 'bg-green-900/30 text-green-400 border-green-700/50' : 'bg-green-100 text-green-700 border-green-300';
      case 'stopped':
        return darkMode ? 'bg-gray-700/30 text-gray-400 border-gray-600/50' : 'bg-gray-100 text-gray-600 border-gray-300';
      case 'building':
      case 'deploying':
        return darkMode ? 'bg-blue-900/30 text-blue-400 border-blue-700/50' : 'bg-blue-100 text-blue-700 border-blue-300';
      case 'failed':
        return darkMode ? 'bg-red-900/30 text-red-400 border-red-700/50' : 'bg-red-100 text-red-700 border-red-300';
      default:
        return darkMode ? 'bg-gray-700/30 text-gray-400 border-gray-600/50' : 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  // Services are already filtered by the API based on queryKey parameters
  const filteredServices = services;

  const stats = {
    total: services.length,
    running: services.filter(s => s.status === 'running').length,
    stopped: services.filter(s => s.status === 'stopped').length,
    autoDeploy: services.filter(s => s.type === 'Deployment' && s.autoDeploy).length
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`rounded-2xl border backdrop-blur-sm transition-all duration-300 p-12 flex items-center justify-center ${
        darkMode
          ? 'bg-gray-800/50 border-gray-700/50'
          : 'bg-white/80 border-gray-200/50'
      }`}>
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className={`w-8 h-8 animate-spin ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Loading services...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`rounded-2xl border backdrop-blur-sm transition-all duration-300 p-12 ${
        darkMode
          ? 'bg-gray-800/50 border-gray-700/50'
          : 'bg-white/80 border-gray-200/50'
      }`}>
        <div className="text-center">
          <p className={`text-lg font-medium mb-2 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
            Failed to load services
          </p>
          <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </p>
          <button
            onClick={() => refetch()}
            className={`px-4 py-2 rounded-lg ${
              darkMode
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-purple-500 hover:bg-purple-600 text-white'
            }`}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
      darkMode
        ? 'bg-gray-800/50 border-gray-700/50 shadow-lg shadow-gray-900/20'
        : 'bg-white/80 border-gray-200/50 shadow-lg shadow-gray-200/20'
    }`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${
              darkMode ? 'bg-purple-900/50' : 'bg-purple-100/50'
            }`}>
              <Server className={`w-6 h-6 ${
                darkMode ? 'text-purple-400' : 'text-purple-600'
              }`} />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Self-Hosted Services
              </h2>
              <p className={`text-sm ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Unified view of Docker containers and deployments
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAddModal(true)}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                darkMode
                  ? 'bg-purple-600 text-white hover:bg-purple-500'
                  : 'bg-purple-500 text-white hover:bg-purple-600'
              } hover:scale-105 active:scale-95`}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Service
            </button>
            <button
              onClick={() => refetch()}
              className={`p-2 rounded-lg transition-colors ${
                darkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title="Refresh services"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl border ${
            darkMode
              ? 'bg-gray-700/30 border-gray-600/50'
              : 'bg-gray-50/50 border-gray-200/50'
          }`}>
            <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.total}
            </div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Total Services
            </div>
          </div>
          <div className={`p-4 rounded-xl border ${
            darkMode
              ? 'bg-green-900/20 border-green-700/30'
              : 'bg-green-50 border-green-200'
          }`}>
            <div className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
              {stats.running}
            </div>
            <div className={`text-sm ${darkMode ? 'text-green-400/70' : 'text-green-600'}`}>
              Running
            </div>
          </div>
          <div className={`p-4 rounded-xl border ${
            darkMode
              ? 'bg-gray-700/30 border-gray-600/50'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className={`text-2xl font-bold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {stats.stopped}
            </div>
            <div className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
              Stopped
            </div>
          </div>
          <div className={`p-4 rounded-xl border ${
            darkMode
              ? 'bg-blue-900/20 border-blue-700/30'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
              {stats.autoDeploy}
            </div>
            <div className={`text-sm ${darkMode ? 'text-blue-400/70' : 'text-blue-600'}`}>
              Auto-Deploy
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center space-x-4 mb-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search services..."
              className={`w-full pl-10 pr-4 py-2 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                darkMode
                  ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>

          {/* View Mode */}
          <div className={`flex rounded-lg border ${
            darkMode ? 'border-gray-600' : 'border-gray-300'
          }`}>
            {(['all', 'docker', 'deployment'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 text-sm font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
                  viewMode === mode
                    ? darkMode
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-500 text-white'
                    : darkMode
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {mode === 'all' && 'All'}
                {mode === 'docker' && 'Docker'}
                {mode === 'deployment' && 'Deployments'}
              </button>
            ))}
          </div>

          {/* Filters Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              showFilters
                ? darkMode
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-500 text-white'
                : darkMode
                ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                : 'bg-gray-100/50 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className={`p-4 rounded-xl border ${
            darkMode
              ? 'bg-gray-700/30 border-gray-600/50'
              : 'bg-gray-50/50 border-gray-200/50'
          }`}>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className={`block text-sm font-medium ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    darkMode
                      ? 'bg-gray-700/50 border-gray-600 text-white'
                      : 'bg-white/50 border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="all">All Statuses</option>
                  <option value="running">Running</option>
                  <option value="stopped">Stopped</option>
                  <option value="building">Building</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              {/* More filters can be added here */}
            </div>
          </div>
        )}
      </div>

      {/* Services Grid */}
      <div className="p-6">
        {filteredServices.length === 0 ? (
          <div className={`text-center py-12 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <Server className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No services found</p>
            <p className="text-sm">Try adjusting your filters or add a new service</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((service) => (
              <div
                key={service.id}
                className={`p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02] cursor-pointer ${
                  darkMode
                    ? 'bg-gray-700/50 border-gray-600/50 hover:border-purple-500/50'
                    : 'bg-white/50 border-gray-200 hover:border-purple-400 hover:shadow-md'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {getServiceIcon(service)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium truncate ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`} title={service.name}>
                        {service.name}
                      </h3>
                      <div className="flex items-center space-x-1 min-w-0">
                        <Server className={`w-3 h-3 flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`} />
                        <p className={`text-xs truncate ${
                          darkMode ? 'text-gray-400' : 'text-gray-600'
                        }`} title={service.serverName}>
                          {service.serverName}
                        </p>
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${getStatusColor(service.status)}`}>
                    {service.status}
                  </span>
                </div>

                {/* Service Info */}
                <div className="space-y-2 mb-3">
                  {service.type === 'DockerContainer' && (
                    <>
                      <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className={darkMode ? 'text-gray-500' : 'text-gray-600'}>Image:</span>{' '}
                        <span className="truncate inline-block max-w-full align-bottom" title={`${service.image}:${service.imageTag}`}>
                          {service.image}:{service.imageTag}
                        </span>
                      </div>
                      {service.ports && service.ports.length > 0 && (
                        <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          <span className={darkMode ? 'text-gray-500' : 'text-gray-600'}>Ports:</span>{' '}
                          {service.ports.map(p => p.publicPort ? `${p.publicPort}:${p.privatePort}` : p.privatePort).join(', ')}
                        </div>
                      )}
                    </>
                  )}
                  {service.type === 'Deployment' && (
                    <>
                      <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className={darkMode ? 'text-gray-500' : 'text-gray-600'}>Repo:</span>{' '}
                        <span className="truncate inline-block max-w-full align-bottom" title={service.repositoryName}>
                          {service.repositoryName}
                        </span>
                      </div>
                      <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className={darkMode ? 'text-gray-500' : 'text-gray-600'}>Branch:</span>{' '}
                        <span className="truncate inline-block max-w-[150px] align-bottom" title={service.branch}>
                          {service.branch}
                        </span>
                      </div>
                      {service.autoDeploy && (
                        <div className="flex items-center space-x-1">
                          <Zap className="w-3 h-3 text-yellow-500" />
                          <span className="text-xs text-yellow-500">Auto-Deploy</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-600/50">
                  <div className="flex items-center space-x-1">
                    <button
                      className={`p-1.5 rounded transition-colors ${
                        darkMode
                          ? 'text-gray-400 hover:text-green-400 hover:bg-green-900/20'
                          : 'text-gray-600 hover:text-green-600 hover:bg-green-100'
                      }`}
                      title="Start"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      className={`p-1.5 rounded transition-colors ${
                        darkMode
                          ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/20'
                          : 'text-gray-600 hover:text-red-600 hover:bg-red-100'
                      }`}
                      title="Stop"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                    <button
                      className={`p-1.5 rounded transition-colors ${
                        darkMode
                          ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-900/20'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-100'
                      }`}
                      title="Restart"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center space-x-1">
                    {service.url && (
                      <button
                        className={`p-1.5 rounded transition-colors ${
                          darkMode
                            ? 'text-gray-400 hover:text-white hover:bg-gray-600'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                        }`}
                        title="Open URL"
                        onClick={() => window.open(service.url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                    {service.type === 'DockerContainer' && service.containerId && (
                      <button
                        onClick={() => openUploadModal(service)}
                        className={`p-1.5 rounded transition-colors ${
                          darkMode
                            ? 'text-gray-400 hover:text-purple-400 hover:bg-purple-900/20'
                            : 'text-gray-600 hover:text-purple-600 hover:bg-purple-100'
                        }`}
                        title="Upload Custom Icon"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      className={`p-1.5 rounded transition-colors ${
                        darkMode
                          ? 'text-gray-400 hover:text-white hover:bg-gray-600'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                      }`}
                      title="Settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Footer - Timestamps */}
                {service.lastDeployedAt && (
                  <div className={`flex items-center space-x-1 mt-2 text-xs ${
                    darkMode ? 'text-gray-500' : 'text-gray-600'
                  }`}>
                    <Clock className="w-3 h-3" />
                    <span>Deployed {new Date(service.lastDeployedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Service Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-2xl border shadow-2xl ${
            darkMode
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Add New Service
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className={`p-1 rounded-lg transition-colors ${
                  darkMode
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                To add services, you need to first configure your Git providers (GitHub, Gitea, or GitLab) in Settings.
              </p>

              <div className="space-y-3">
                {/* Git Provider Option */}
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    navigate('/settings?tab=git-providers');
                  }}
                  className={`w-full flex items-center p-4 rounded-xl border transition-all ${
                    darkMode
                      ? 'bg-gray-700/50 border-gray-600 hover:border-purple-500 hover:bg-gray-700'
                      : 'bg-gray-50 border-gray-200 hover:border-purple-400 hover:bg-gray-100'
                  }`}
                >
                  <div className={`p-3 rounded-lg ${
                    darkMode ? 'bg-purple-900/30' : 'bg-purple-100'
                  }`}>
                    <Github className={`w-6 h-6 ${
                      darkMode ? 'text-purple-400' : 'text-purple-600'
                    }`} />
                  </div>
                  <div className="ml-4 flex-1 text-left">
                    <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Set up Git Providers
                    </h4>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Connect GitHub, Gitea, or GitLab
                    </p>
                  </div>
                  <ExternalLink className={`w-5 h-5 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`} />
                </button>

                {/* Auto-Deploy Info */}
                <div className={`p-4 rounded-xl border ${
                  darkMode
                    ? 'bg-blue-900/20 border-blue-700/50'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start space-x-3">
                    <GitBranchPlus className={`w-5 h-5 flex-shrink-0 ${
                      darkMode ? 'text-blue-400' : 'text-blue-600'
                    }`} />
                    <div>
                      <h5 className={`text-sm font-medium ${
                        darkMode ? 'text-blue-300' : 'text-blue-900'
                      }`}>
                        Coming Soon: Auto-Deployment
                      </h5>
                      <p className={`text-xs mt-1 ${
                        darkMode ? 'text-blue-400' : 'text-blue-700'
                      }`}>
                        Automatic deployment detection for new branches with intelligent port management
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-700/50">
              <button
                onClick={() => setShowAddModal(false)}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                  darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Icon Upload Modal */}
      {uploadModalOpen && selectedService && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-2xl border shadow-2xl ${
            darkMode
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Upload Icon for {selectedService.name}
              </h3>
              <button
                onClick={closeUploadModal}
                disabled={updateIconMutation.isPending}
                className={`p-1 rounded-lg transition-colors ${
                  darkMode
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
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
                  disabled={updateIconMutation.isPending}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
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
                    disabled={updateIconMutation.isPending}
                    className={`flex-1 px-3 py-2 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                  <button
                    onClick={handleIconUrlSubmit}
                    disabled={!iconUrl.trim() || updateIconMutation.isPending}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      !iconUrl.trim() || updateIconMutation.isPending
                        ? darkMode
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
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
                    disabled={updateIconMutation.isPending}
                    className="mt-0.5 rounded border-gray-400 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    disabled={!iconUrl.trim() || updateIconMutation.isPending}
                    className="mt-0.5 rounded border-gray-400 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <Loader2 className={`w-6 h-6 animate-spin ${
                    darkMode ? 'text-purple-400' : 'text-purple-600'
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
};
