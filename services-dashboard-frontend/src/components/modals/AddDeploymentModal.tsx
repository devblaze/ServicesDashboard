import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Rocket, Loader2, AlertCircle, GitBranch, FileCode2 } from 'lucide-react';
import { deploymentsApi } from '../../services/deploymentsApi';
import { gitRepositoriesApi } from '../../services/gitRepositoriesApi';
import { serverManagementApi } from '../../services/serverManagementApi';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import type { CreateDeploymentRequest, DeploymentType, DeploymentSource } from '../../types/Deployment';

interface AddDeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

interface FormData {
  name: string;
  deploymentSource: DeploymentSource;
  gitRepositoryId: string;
  serverId: string;
  type: DeploymentType;
  branch: string;
  autoDeploy: boolean;
  // Manual deployment fields
  deploymentPath: string;
  dockerComposeFile: string;
  dockerComposeFileContent: string;
}

interface FormErrors {
  [key: string]: string;
}

const DEPLOYMENT_TYPE_OPTIONS: { value: DeploymentType; label: string; icon: string }[] = [
  { value: 'DockerCompose', label: 'Docker Compose', icon: '🐳' },
  { value: 'Docker', label: 'Docker', icon: '📦' },
  { value: 'Kubernetes', label: 'Kubernetes', icon: '☸️' },
  { value: 'Script', label: 'Custom Script', icon: '📜' },
];

const DEFAULT_FORM_DATA: FormData = {
  name: '',
  deploymentSource: 'Git',
  gitRepositoryId: '',
  serverId: '',
  type: 'DockerCompose',
  branch: '',
  autoDeploy: false,
  deploymentPath: '',
  dockerComposeFile: '',
  dockerComposeFileContent: '',
};

export const AddDeploymentModal: React.FC<AddDeploymentModalProps> = ({
  isOpen,
  onClose,
  darkMode = true
}) => {
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<FormErrors>({});

  const queryClient = useQueryClient();

  // Fetch repositories
  const { data: repositories = [] } = useQuery({
    queryKey: ['repositories'],
    queryFn: () => gitRepositoriesApi.getAllRepositories(),
    enabled: isOpen,
  });

  // Fetch servers
  const { data: servers = [] } = useQuery({
    queryKey: ['managed-servers'],
    queryFn: () => serverManagementApi.getServers(),
    enabled: isOpen,
  });

  // Create deployment mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateDeploymentRequest) => {
      return await deploymentsApi.createDeployment(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      handleClose();
    },
    onError: (error) => {
      console.error('Failed to create deployment:', error);
      setErrors({ submit: 'Failed to create deployment. Please try again.' });
    }
  });

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Deployment name is required';
    }

    if (formData.deploymentSource === 'Git') {
      if (!formData.gitRepositoryId) {
        newErrors.gitRepositoryId = 'Repository is required';
      }
    } else {
      // Manual deployment validation
      if (!formData.deploymentPath.trim()) {
        newErrors.deploymentPath = 'Deployment path is required';
      }
      if (!formData.dockerComposeFile.trim() && !formData.dockerComposeFileContent.trim()) {
        newErrors.dockerComposeFile = 'Either Docker Compose file path or content is required';
      }
    }

    if (!formData.serverId) {
      newErrors.serverId = 'Server is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleInputChange = useCallback((field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const deploymentData: CreateDeploymentRequest = {
      name: formData.name.trim(),
      deploymentSource: formData.deploymentSource,
      serverId: parseInt(formData.serverId),
      type: formData.type,
      autoDeploy: formData.autoDeploy,
    };

    // Add Git-specific fields
    if (formData.deploymentSource === 'Git') {
      deploymentData.gitRepositoryId = parseInt(formData.gitRepositoryId);
      deploymentData.branch = formData.branch.trim() || undefined;
    } else {
      // Add Manual deployment fields
      deploymentData.deploymentPath = formData.deploymentPath.trim();
      deploymentData.dockerComposeFile = formData.dockerComposeFile.trim() || undefined;
      deploymentData.dockerComposeFileContent = formData.dockerComposeFileContent.trim() || undefined;
    }

    createMutation.mutate(deploymentData);
  }, [formData, validateForm, createMutation]);

  const handleClose = useCallback(() => {
    if (createMutation.isPending) return;

    setFormData(DEFAULT_FORM_DATA);
    setErrors({});
    onClose();
  }, [createMutation.isPending, onClose]);

  // Handle ESC key to close modal
  useEscapeKey(handleClose, isOpen && !createMutation.isPending);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-2xl rounded-2xl border backdrop-blur-sm ${
        darkMode
          ? 'bg-gray-800/95 border-gray-700/50 shadow-xl shadow-gray-900/25'
          : 'bg-white/95 border-gray-200/50 shadow-xl shadow-gray-200/25'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/10">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              darkMode ? 'bg-blue-900/50' : 'bg-blue-100/50'
            }`}>
              <Rocket className={`w-5 h-5 ${
                darkMode ? 'text-blue-400' : 'text-blue-600'
              }`} />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Create Deployment
              </h2>
              <p className={`text-sm ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Deploy your application to a server
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={createMutation.isPending}
            className={`p-2 rounded-lg transition-colors ${
              darkMode
                ? 'hover:bg-gray-700/50 text-gray-400 hover:text-white'
                : 'hover:bg-gray-100/50 text-gray-600 hover:text-gray-900'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Deployment Name */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Deployment Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="My App Production"
              disabled={createMutation.isPending}
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                darkMode
                  ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                  : 'bg-white/50 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
              } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                errors.name ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-400">{errors.name}</p>
            )}
          </div>

          {/* Deployment Source */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Deployment Source *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleInputChange('deploymentSource', 'Git')}
                disabled={createMutation.isPending}
                className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg border transition-all ${
                  formData.deploymentSource === 'Git'
                    ? darkMode
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                      : 'bg-blue-100/50 border-blue-400/50 text-blue-700'
                    : darkMode
                      ? 'bg-gray-700/30 border-gray-600/50 text-gray-400 hover:bg-gray-700/50'
                      : 'bg-gray-50/30 border-gray-300/50 text-gray-600 hover:bg-gray-100/50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <GitBranch className="w-4 h-4" />
                <span className="font-medium">Git Repository</span>
              </button>
              <button
                type="button"
                onClick={() => handleInputChange('deploymentSource', 'Manual')}
                disabled={createMutation.isPending}
                className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg border transition-all ${
                  formData.deploymentSource === 'Manual'
                    ? darkMode
                      ? 'bg-purple-600/20 border-purple-500/50 text-purple-400'
                      : 'bg-purple-100/50 border-purple-400/50 text-purple-700'
                    : darkMode
                      ? 'bg-gray-700/30 border-gray-600/50 text-gray-400 hover:bg-gray-700/50'
                      : 'bg-gray-50/30 border-gray-300/50 text-gray-600 hover:bg-gray-100/50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <FileCode2 className="w-4 h-4" />
                <span className="font-medium">Manual Deploy</span>
              </button>
            </div>
            <p className={`mt-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {formData.deploymentSource === 'Git'
                ? 'Deploy from a Git repository with automatic updates'
                : 'Deploy manually with a Docker Compose file'
              }
            </p>
          </div>

          {/* Repository (Git Source Only) */}
          {formData.deploymentSource === 'Git' && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Git Repository *
              </label>
              <select
                value={formData.gitRepositoryId}
                onChange={(e) => handleInputChange('gitRepositoryId', e.target.value)}
                disabled={createMutation.isPending}
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  darkMode
                    ? 'bg-gray-700/50 border-gray-600/50 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                    : 'bg-white/50 border-gray-300/50 text-gray-900 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  errors.gitRepositoryId ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''
                }`}
              >
                <option value="">Select a repository...</option>
                {repositories.map((repo) => (
                  <option key={repo.id} value={repo.id}>
                    {repo.fullName} ({repo.providerName})
                  </option>
                ))}
              </select>
              {errors.gitRepositoryId && (
                <p className="mt-1 text-sm text-red-400">{errors.gitRepositoryId}</p>
              )}
              {repositories.length === 0 && (
                <p className={`mt-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No repositories found. Add a Git provider in Settings first.
                </p>
              )}
            </div>
          )}

          {/* Manual Deployment Fields */}
          {formData.deploymentSource === 'Manual' && (
            <>
              {/* Deployment Path */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Deployment Path *
                </label>
                <input
                  type="text"
                  value={formData.deploymentPath}
                  onChange={(e) => handleInputChange('deploymentPath', e.target.value)}
                  placeholder="/opt/deployments/my-app"
                  disabled={createMutation.isPending}
                  className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                    darkMode
                      ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                      : 'bg-white/50 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                  } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                    errors.deploymentPath ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''
                  }`}
                />
                {errors.deploymentPath && (
                  <p className="mt-1 text-sm text-red-400">{errors.deploymentPath}</p>
                )}
                <p className={`mt-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  The directory on the server where your application is located
                </p>
              </div>

              {/* Docker Compose File Path */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Docker Compose File Path
                </label>
                <input
                  type="text"
                  value={formData.dockerComposeFile}
                  onChange={(e) => handleInputChange('dockerComposeFile', e.target.value)}
                  placeholder="/opt/deployments/my-app/docker-compose.yml"
                  disabled={createMutation.isPending}
                  className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                    darkMode
                      ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                      : 'bg-white/50 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                  } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                    errors.dockerComposeFile ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''
                  }`}
                />
                <p className={`mt-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Path to your docker-compose.yml file on the server
                </p>
              </div>

              {/* Docker Compose Content (Optional) */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Docker Compose Content <span className="text-sm font-normal text-gray-500">(optional)</span>
                </label>
                <textarea
                  value={formData.dockerComposeFileContent}
                  onChange={(e) => handleInputChange('dockerComposeFileContent', e.target.value)}
                  placeholder="version: '3.8'&#10;services:&#10;  web:&#10;    image: nginx:latest&#10;    ports:&#10;      - '80:80'"
                  rows={8}
                  disabled={createMutation.isPending}
                  className={`w-full px-3 py-2 rounded-lg border transition-colors font-mono text-sm ${
                    darkMode
                      ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                      : 'bg-white/50 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                  } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
                />
                <p className={`mt-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Paste your docker-compose.yml content directly (alternative to file path)
                </p>
                {errors.dockerComposeFile && (
                  <p className="mt-1 text-sm text-red-400">{errors.dockerComposeFile}</p>
                )}
              </div>
            </>
          )}

          {/* Server */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Target Server *
            </label>
            <select
              value={formData.serverId}
              onChange={(e) => handleInputChange('serverId', e.target.value)}
              disabled={createMutation.isPending}
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                darkMode
                  ? 'bg-gray-700/50 border-gray-600/50 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                  : 'bg-white/50 border-gray-300/50 text-gray-900 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
              } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                errors.serverId ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''
              }`}
            >
              <option value="">Select a server...</option>
              {servers.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.name} ({server.hostAddress})
                </option>
              ))}
            </select>
            {errors.serverId && (
              <p className="mt-1 text-sm text-red-400">{errors.serverId}</p>
            )}
          </div>

          {/* Deployment Type */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Deployment Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value as DeploymentType)}
              disabled={createMutation.isPending}
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                darkMode
                  ? 'bg-gray-700/50 border-gray-600/50 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                  : 'bg-white/50 border-gray-300/50 text-gray-900 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
              } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {DEPLOYMENT_TYPE_OPTIONS.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Branch (Git Source Only) */}
          {formData.deploymentSource === 'Git' && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Branch <span className="text-sm font-normal text-gray-500">(optional)</span>
              </label>
              <input
                type="text"
                value={formData.branch}
                onChange={(e) => handleInputChange('branch', e.target.value)}
                placeholder="main"
                disabled={createMutation.isPending}
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  darkMode
                    ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                    : 'bg-white/50 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
              />
              <p className={`mt-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Leave empty to use the repository's default branch
              </p>
            </div>
          )}

          {/* Auto Deploy */}
          <div className="flex items-center justify-between">
            <div>
              <label className={`block text-sm font-medium ${
                darkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Auto-deploy
              </label>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {formData.deploymentSource === 'Git'
                  ? 'Automatically deploy when changes are pushed to the repository'
                  : 'Enable automatic deployment monitoring for this deployment'
                }
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoDeploy}
                onChange={(e) => handleInputChange('autoDeploy', e.target.checked)}
                disabled={createMutation.isPending}
                className="sr-only peer"
              />
              <div className={`w-11 h-6 rounded-full peer transition-colors ${
                darkMode
                  ? 'bg-gray-700 peer-checked:bg-blue-600'
                  : 'bg-gray-300 peer-checked:bg-blue-500'
              } peer-focus:ring-2 peer-focus:ring-blue-500/20 peer-disabled:opacity-50`}>
                <div className={`absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  formData.autoDeploy ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </label>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className={`p-3 rounded-lg border ${
              darkMode
                ? 'bg-red-900/20 border-red-600/50 text-red-300'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <p className="text-sm font-medium">{errors.submit}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={createMutation.isPending}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white border border-gray-600/50'
                  : 'bg-gray-100/50 hover:bg-gray-200/50 text-gray-700 hover:text-gray-900 border border-gray-300/50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className={`flex items-center justify-center flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                darkMode
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-600/25'
                  : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Rocket className="w-4 h-4" />
              )}
              <span className="ml-2">
                {createMutation.isPending ? 'Creating...' : 'Create Deployment'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
