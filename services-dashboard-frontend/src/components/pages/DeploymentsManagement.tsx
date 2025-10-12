import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Rocket,
  Plus,
  RefreshCw,
  Loader2,
  Trash2,
  Settings,
  Play,
  Square,
  GitBranch,
  Server as ServerIcon,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { deploymentsApi } from '../../services/deploymentsApi';
import { AddDeploymentModal } from '../modals/AddDeploymentModal';
import type { Deployment, DeploymentStatus, DeploymentType } from '../../types/Deployment';

interface DeploymentsManagementProps {
  darkMode?: boolean;
}

export const DeploymentsManagement: React.FC<DeploymentsManagementProps> = ({ darkMode = true }) => {
  const [selectedServerId] = useState<number | undefined>(undefined);
  const [selectedRepositoryId] = useState<number | undefined>(undefined);
  const [showAddModal, setShowAddModal] = useState(false);

  const queryClient = useQueryClient();

  // Fetch deployments
  const {
    data: deployments = [],
    isLoading
  } = useQuery<Deployment[], Error>({
    queryKey: ['deployments', selectedServerId, selectedRepositoryId],
    queryFn: () => deploymentsApi.getAllDeployments(selectedServerId, selectedRepositoryId),
    retry: 1,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deploymentsApi.deleteDeployment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    },
  });

  // Execute deployment mutation
  const executeMutation = useMutation({
    mutationFn: (deploymentId: number) => deploymentsApi.executeDeployment({ deploymentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    },
  });

  // Stop deployment mutation
  const stopMutation = useMutation({
    mutationFn: (id: number) => deploymentsApi.stopDeployment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
    },
  });

  const getDeploymentTypeIcon = (type: DeploymentType) => {
    switch (type) {
      case 'DockerCompose': return '🐳';
      case 'Docker': return '📦';
      case 'Kubernetes': return '☸️';
      case 'Script': return '📜';
      default: return '🚀';
    }
  };

  const getStatusIcon = (status: DeploymentStatus) => {
    switch (status) {
      case 'Running':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'Failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'Building':
      case 'Deploying':
      case 'Updating':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'Stopped':
        return <Square className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: DeploymentStatus) => {
    switch (status) {
      case 'Running':
        return darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700';
      case 'Failed':
        return darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700';
      case 'Building':
      case 'Deploying':
      case 'Updating':
        return darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700';
      case 'Stopped':
        return darkMode ? 'bg-gray-700/30 text-gray-400' : 'bg-gray-100 text-gray-600';
      default:
        return darkMode ? 'bg-gray-700/30 text-gray-400' : 'bg-gray-100 text-gray-600';
    }
  };

  const canExecute = (status: DeploymentStatus) => {
    return !['Building', 'Deploying', 'Updating'].includes(status);
  };

  const canStop = (status: DeploymentStatus) => {
    return ['Running', 'Building', 'Deploying', 'Updating'].includes(status);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 rounded-2xl border ${
        darkMode
          ? 'bg-gray-800/50 border-gray-700/50 backdrop-blur-sm'
          : 'bg-white/80 border-gray-200/50 backdrop-blur-sm shadow-lg'
      }`}>
        <div className="text-center">
          <RefreshCw className={`w-8 h-8 animate-spin mx-auto mb-3 ${
            darkMode ? 'text-blue-400' : 'text-blue-600'
          }`} />
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Loading deployments...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-2xl border backdrop-blur-sm p-6 ${
        darkMode
          ? 'bg-gray-800/50 border-gray-700/50 shadow-lg shadow-gray-900/20'
          : 'bg-white/80 border-gray-200/50 shadow-lg shadow-gray-200/20'
      }`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${
              darkMode ? 'bg-blue-900/50' : 'bg-blue-100/50'
            }`}>
              <Rocket className={`w-6 h-6 ${
                darkMode ? 'text-blue-400' : 'text-blue-600'
              }`} />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Deployments
              </h2>
              <p className={`text-sm ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Manage and monitor your application deployments
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className={`flex items-center px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
              darkMode
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/25'
                : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25'
            }`}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Deployment
          </button>
        </div>
      </div>

      {/* Deployments Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {deployments.map((deployment) => (
          <div
            key={deployment.id}
            className={`p-6 rounded-xl border transition-all ${
              darkMode
                ? 'bg-gray-800/30 border-gray-700/50 hover:border-gray-600'
                : 'bg-white/80 border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{getDeploymentTypeIcon(deployment.type)}</span>
                <div>
                  <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {deployment.name}
                  </h3>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {deployment.type}
                  </p>
                </div>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium flex items-center space-x-1 ${
                getStatusColor(deployment.status)
              }`}>
                {getStatusIcon(deployment.status)}
                <span>{deployment.status}</span>
              </div>
            </div>

            {/* Info */}
            <div className="space-y-2 mb-4">
              <div className={`flex items-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <GitBranch className="w-4 h-4 mr-2" />
                <span className="truncate">{deployment.repositoryName}</span>
              </div>
              <div className={`flex items-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <ServerIcon className="w-4 h-4 mr-2" />
                <span className="truncate">{deployment.serverName}</span>
              </div>
              {deployment.branch && (
                <div className={`flex items-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <GitBranch className="w-4 h-4 mr-2" />
                  <span>Branch: {deployment.branch}</span>
                </div>
              )}
              {deployment.lastDeployedAt && (
                <div className={`flex items-center text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  <Clock className="w-3 h-3 mr-1" />
                  <span>Last: {new Date(deployment.lastDeployedAt).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Auto Deploy Badge */}
            {deployment.autoDeploy && (
              <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium mb-4 ${
                darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
              }`}>
                Auto-deploy enabled
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={() => executeMutation.mutate(deployment.id)}
                disabled={!canExecute(deployment.status) || executeMutation.isPending}
                className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  canExecute(deployment.status)
                    ? darkMode
                      ? 'bg-green-900/30 hover:bg-green-900/50 text-green-400'
                      : 'bg-green-100 hover:bg-green-200 text-green-700'
                    : 'opacity-50 cursor-not-allowed bg-gray-700/30 text-gray-500'
                }`}
              >
                {executeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-1" />
                )}
                Deploy
              </button>

              {canStop(deployment.status) && (
                <button
                  onClick={() => stopMutation.mutate(deployment.id)}
                  disabled={stopMutation.isPending}
                  className={`flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    darkMode
                      ? 'bg-orange-900/30 hover:bg-orange-900/50 text-orange-400'
                      : 'bg-orange-100 hover:bg-orange-200 text-orange-700'
                  } disabled:opacity-50`}
                >
                  {stopMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              )}

              <button
                onClick={() => {/* TODO: Open settings modal */}}
                className={`flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  darkMode
                    ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <Settings className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  if (confirm(`Delete deployment "${deployment.name}"?`)) {
                    deleteMutation.mutate(deployment.id);
                  }
                }}
                disabled={deleteMutation.isPending}
                className={`flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  darkMode
                    ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400'
                    : 'bg-red-100 hover:bg-red-200 text-red-700'
                } disabled:opacity-50`}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {deployments.length === 0 && !isLoading && (
        <div className={`text-center py-12 rounded-2xl border ${
          darkMode
            ? 'bg-gray-800/50 border-gray-700/50 backdrop-blur-sm'
            : 'bg-white/80 border-gray-200/50 backdrop-blur-sm shadow-lg'
        }`}>
          <Rocket className={`w-16 h-16 mx-auto mb-4 ${
            darkMode ? 'text-gray-600' : 'text-gray-400'
          }`} />
          <h3 className={`text-xl font-semibold mb-2 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            No Deployments Configured
          </h3>
          <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Create your first deployment to start managing applications
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className={`inline-flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              darkMode
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/25'
                : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25'
            }`}
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Deployment
          </button>
        </div>
      )}

      {/* Add Deployment Modal */}
      <AddDeploymentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        darkMode={darkMode}
      />
    </div>
  );
};
