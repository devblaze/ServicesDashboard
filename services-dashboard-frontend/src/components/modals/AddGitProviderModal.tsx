import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  GitBranch,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Wifi
} from 'lucide-react';
import { gitProvidersApi } from '../../services/gitProvidersApi';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import type { CreateGitProviderRequest, GitProviderType } from '../../types/Deployment';

interface AddGitProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

interface FormData {
  name: string;
  providerType: GitProviderType;
  baseUrl: string;
  accessToken: string;
}

interface FormErrors {
  [key: string]: string;
}

const PROVIDER_TYPES: { value: GitProviderType; label: string; icon: string; defaultUrl: string }[] = [
  { value: 'GitHub', label: 'GitHub', icon: '🐙', defaultUrl: 'https://api.github.com' },
  { value: 'GitLab', label: 'GitLab', icon: '🦊', defaultUrl: 'https://gitlab.com' },
  { value: 'Gitea', label: 'Gitea', icon: '🍵', defaultUrl: '' },
];

const DEFAULT_FORM_DATA: FormData = {
  name: '',
  providerType: 'GitHub',
  baseUrl: 'https://api.github.com',
  accessToken: '',
};

export const AddGitProviderModal: React.FC<AddGitProviderModalProps> = ({
  isOpen,
  onClose,
  darkMode = true
}) => {
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
    userInfo?: string;
  } | null>(null);

  const queryClient = useQueryClient();

  // Add provider mutation
  const addProviderMutation = useMutation({
    mutationFn: async (data: CreateGitProviderRequest) => {
      return await gitProvidersApi.createProvider(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git-providers'] });
      handleClose();
    },
    onError: (error) => {
      console.error('Failed to add git provider:', error);
      setErrors({ submit: 'Failed to add git provider. Please check your connection and try again.' });
    }
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (data: CreateGitProviderRequest) => {
      return await gitProvidersApi.testConnection({
        providerType: data.providerType,
        baseUrl: data.baseUrl,
        accessToken: data.accessToken,
      });
    },
    onSuccess: (result) => {
      setConnectionTestResult({
        success: result.success,
        message: result.message,
        userInfo: result.username,
      });
      setIsTestingConnection(false);
    },
    onError: (error) => {
      console.error('Connection test failed:', error);
      setConnectionTestResult({
        success: false,
        message: 'Connection test failed. Please check your settings and try again.',
      });
      setIsTestingConnection(false);
    }
  });

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Provider name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Provider name must be at least 2 characters';
    }

    // Base URL validation
    if (!formData.baseUrl.trim()) {
      newErrors.baseUrl = 'Base URL is required';
    } else {
      try {
        new URL(formData.baseUrl);
      } catch {
        newErrors.baseUrl = 'Please enter a valid URL';
      }
    }

    // Access token validation
    if (!formData.accessToken.trim()) {
      newErrors.accessToken = 'Access token is required';
    } else if (formData.accessToken.length < 10) {
      newErrors.accessToken = 'Access token seems too short';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleInputChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Update base URL when provider type changes
    if (field === 'providerType') {
      const provider = PROVIDER_TYPES.find(p => p.value === value);
      if (provider && provider.defaultUrl) {
        setFormData(prev => ({ ...prev, baseUrl: provider.defaultUrl }));
      }
    }

    // Clear specific field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Clear connection test result when connection-related fields change
    if (['baseUrl', 'accessToken', 'providerType'].includes(field)) {
      setConnectionTestResult(null);
    }
  }, [errors]);

  const handleTestConnection = useCallback(async () => {
    if (!validateForm()) return;

    setIsTestingConnection(true);
    setConnectionTestResult(null);

    const testData: CreateGitProviderRequest = {
      name: formData.name.trim(),
      providerType: formData.providerType,
      baseUrl: formData.baseUrl.trim(),
      accessToken: formData.accessToken.trim(),
    };

    testConnectionMutation.mutate(testData);
  }, [formData, validateForm, testConnectionMutation]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const providerData: CreateGitProviderRequest = {
      name: formData.name.trim(),
      providerType: formData.providerType,
      baseUrl: formData.baseUrl.trim(),
      accessToken: formData.accessToken.trim(),
    };

    addProviderMutation.mutate(providerData);
  }, [formData, validateForm, addProviderMutation]);

  const handleClose = useCallback(() => {
    if (addProviderMutation.isPending) return;

    setFormData(DEFAULT_FORM_DATA);
    setErrors({});
    setShowAccessToken(false);
    setConnectionTestResult(null);
    setIsTestingConnection(false);
    onClose();
  }, [addProviderMutation.isPending, onClose]);

  // Handle ESC key to close modal
  useEscapeKey(handleClose, isOpen && !addProviderMutation.isPending);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-md rounded-2xl border backdrop-blur-sm ${
        darkMode
          ? 'bg-gray-800/95 border-gray-700/50 shadow-xl shadow-gray-900/25'
          : 'bg-white/95 border-gray-200/50 shadow-xl shadow-gray-200/25'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/10">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              darkMode ? 'bg-purple-900/50' : 'bg-purple-100/50'
            }`}>
              <GitBranch className={`w-5 h-5 ${
                darkMode ? 'text-purple-400' : 'text-purple-600'
              }`} />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Add Git Provider
              </h2>
              <p className={`text-sm ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Connect to GitHub, GitLab, or Gitea
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={addProviderMutation.isPending}
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
          {/* Provider Name */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Provider Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="My GitHub Account"
              disabled={addProviderMutation.isPending}
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                darkMode
                  ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20'
                  : 'bg-white/50 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20'
              } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                errors.name ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-400">{errors.name}</p>
            )}
          </div>

          {/* Provider Type */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Provider Type *
            </label>
            <select
              value={formData.providerType}
              onChange={(e) => handleInputChange('providerType', e.target.value as GitProviderType)}
              disabled={addProviderMutation.isPending}
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                darkMode
                  ? 'bg-gray-700/50 border-gray-600/50 text-white focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20'
                  : 'bg-white/50 border-gray-300/50 text-gray-900 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20'
              } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {PROVIDER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Base URL */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Base URL *
            </label>
            <input
              type="text"
              value={formData.baseUrl}
              onChange={(e) => handleInputChange('baseUrl', e.target.value)}
              placeholder="https://api.github.com"
              disabled={addProviderMutation.isPending}
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                darkMode
                  ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20'
                  : 'bg-white/50 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20'
              } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                errors.baseUrl ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''
              }`}
            />
            {errors.baseUrl && (
              <p className="mt-1 text-sm text-red-400">{errors.baseUrl}</p>
            )}
            <p className={`mt-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {formData.providerType === 'GitHub' && 'Use https://api.github.com for GitHub.com'}
              {formData.providerType === 'GitLab' && 'Use https://gitlab.com for GitLab.com'}
              {formData.providerType === 'Gitea' && 'Enter your Gitea server URL'}
            </p>
          </div>

          {/* Access Token */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Access Token *
            </label>
            <div className="relative">
              <input
                type={showAccessToken ? 'text' : 'password'}
                value={formData.accessToken}
                onChange={(e) => handleInputChange('accessToken', e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx or glpat-xxxxxxxxxxxx"
                disabled={addProviderMutation.isPending}
                className={`w-full px-3 py-2 pr-10 rounded-lg border transition-colors ${
                  darkMode
                    ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20'
                    : 'bg-white/50 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20'
                } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  errors.accessToken ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => setShowAccessToken(!showAccessToken)}
                disabled={addProviderMutation.isPending}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${
                  darkMode
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-600 hover:text-gray-900'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {showAccessToken ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.accessToken && (
              <p className="mt-1 text-sm text-red-400">{errors.accessToken}</p>
            )}
            <p className={`mt-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {formData.providerType === 'GitHub' && 'Create a token at Settings → Developer settings → Personal access tokens'}
              {formData.providerType === 'GitLab' && 'Create a token at Settings → Access Tokens'}
              {formData.providerType === 'Gitea' && 'Create a token at Settings → Applications → Access Tokens'}
            </p>
          </div>

          {/* Connection Test Result */}
          {connectionTestResult && (
            <div className={`p-3 rounded-lg border ${
              connectionTestResult.success
                ? darkMode
                  ? 'bg-green-900/20 border-green-600/50 text-green-300'
                  : 'bg-green-50 border-green-200 text-green-700'
                : darkMode
                  ? 'bg-red-900/20 border-red-600/50 text-red-300'
                  : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="flex items-start space-x-2">
                {connectionTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">{connectionTestResult.message}</p>
                  {connectionTestResult.userInfo && (
                    <p className="text-xs mt-1 opacity-75">Connected as: {connectionTestResult.userInfo}</p>
                  )}
                </div>
              </div>
            </div>
          )}

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
              onClick={handleTestConnection}
              disabled={addProviderMutation.isPending || isTestingConnection}
              className={`flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                darkMode
                  ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white border border-gray-600/50'
                  : 'bg-gray-100/50 hover:bg-gray-200/50 text-gray-700 hover:text-gray-900 border border-gray-300/50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isTestingConnection ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4" />
              )}
              <span className="ml-2">Test Connection</span>
            </button>

            <button
              type="submit"
              disabled={addProviderMutation.isPending || isTestingConnection}
              className={`flex items-center justify-center flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                darkMode
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-600/25'
                  : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg shadow-purple-500/25'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {addProviderMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <GitBranch className="w-4 h-4" />
              )}
              <span className="ml-2">
                {addProviderMutation.isPending ? 'Adding Provider...' : 'Add Provider'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
