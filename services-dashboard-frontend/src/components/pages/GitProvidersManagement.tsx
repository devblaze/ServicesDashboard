import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { GitBranch, Plus, RefreshCw, Loader2, Trash2, Settings } from 'lucide-react';
import { gitProvidersApi } from '../../services/gitProvidersApi';
import { AddGitProviderModal } from '../modals/AddGitProviderModal';
import { EditGitProviderModal } from '../modals/EditGitProviderModal';
import type { GitProviderConnection, GitProviderType } from '../../types/Deployment';

interface GitProvidersManagementProps {
  darkMode?: boolean;
}

export const GitProvidersManagement: React.FC<GitProvidersManagementProps> = ({ darkMode = true }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<GitProviderConnection | null>(null);

  const queryClient = useQueryClient();

  // Fetch providers
  const {
    data: providers = [],
    isLoading
  } = useQuery<GitProviderConnection[], Error>({
    queryKey: ['git-providers'],
    queryFn: () => gitProvidersApi.getAllProviders(),
    retry: 1,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => gitProvidersApi.deleteProvider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git-providers'] });
    },
  });

  const getProviderIcon = (type: GitProviderType) => {
    switch (type) {
      case 'GitHub': return '🐙';
      case 'GitLab': return '🦊';
      case 'Gitea': return '🍵';
      default: return '📦';
    }
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
            Loading git providers...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border backdrop-blur-sm p-6 ${
      darkMode
        ? 'bg-gray-800/50 border-gray-700/50 shadow-lg shadow-gray-900/20'
        : 'bg-white/80 border-gray-200/50 shadow-lg shadow-gray-200/20'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className={`text-lg font-semibold ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Git Provider Connections
          </h3>
          <p className={`text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Connect to GitHub, GitLab, or Gitea to manage your deployments
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className={`flex items-center px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
            darkMode
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-600/25'
              : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25'
          }`}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Provider
        </button>
      </div>

      {/* Providers Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className={`p-6 rounded-xl border transition-all ${
              darkMode
                ? 'bg-gray-800/30 border-gray-700/50 hover:border-gray-600'
                : 'bg-white/80 border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{getProviderIcon(provider.providerType)}</span>
                <div>
                  <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {provider.name}
                  </h3>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {provider.providerType}
                  </p>
                </div>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                provider.isActive
                  ? darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                  : darkMode ? 'bg-gray-700/30 text-gray-400' : 'bg-gray-100 text-gray-600'
              }`}>
                {provider.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>

            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {provider.baseUrl}
            </p>

            {provider.repositoryCount !== undefined && (
              <div className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {provider.repositoryCount} repositories
              </div>
            )}

            <div className="flex space-x-2">
              <button
                onClick={() => setEditingProvider(provider)}
                className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  darkMode
                    ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <Settings className="w-4 h-4 mr-1" />
                Settings
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete ${provider.name}?`)) {
                    deleteMutation.mutate(provider.id);
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
      {providers.length === 0 && !isLoading && (
        <div className={`text-center py-12 mt-4 rounded-xl border ${
          darkMode
            ? 'bg-gray-700/30 border-gray-600/50'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <GitBranch className={`w-16 h-16 mx-auto mb-4 ${
            darkMode ? 'text-gray-600' : 'text-gray-400'
          }`} />
          <h3 className={`text-xl font-semibold mb-2 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            No Git Providers Configured
          </h3>
          <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Connect to GitHub, GitLab, or Gitea to start managing deployments
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className={`inline-flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              darkMode
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-600/25'
                : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25'
            }`}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Your First Provider
          </button>
        </div>
      )}

      {/* Modals */}
      <AddGitProviderModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        darkMode={darkMode}
      />

      <EditGitProviderModal
        isOpen={editingProvider !== null}
        onClose={() => setEditingProvider(null)}
        provider={editingProvider}
        darkMode={darkMode}
      />
    </div>
  );
};
