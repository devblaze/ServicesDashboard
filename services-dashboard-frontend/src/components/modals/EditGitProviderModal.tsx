import React, { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  GitBranch,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Wifi,
  Save
} from 'lucide-react';
import { gitProvidersApi } from '../../services/gitProvidersApi';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import type { GitProviderConnection, UpdateGitProviderRequest } from '../../types/Deployment';

interface EditGitProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: GitProviderConnection | null;
  darkMode?: boolean;
}

interface FormData {
  name: string;
  baseUrl: string;
  accessToken: string;
  isActive: boolean;
}

interface FormErrors {
  [key: string]: string;
}

export const EditGitProviderModal: React.FC<EditGitProviderModalProps> = ({
  isOpen,
  onClose,
  provider,
  darkMode = true
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    baseUrl: '',
    accessToken: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
    userInfo?: string;
  } | null>(null);

  const queryClient = useQueryClient();

  // Initialize form data when provider changes
  useEffect(() => {
    if (provider) {
      setFormData({
        name: provider.name,
        baseUrl: provider.baseUrl,
        accessToken: '', // Never pre-fill tokens for security
        isActive: provider.isActive,
      });
    }
  }, [provider]);

  // Update provider mutation
  const updateProviderMutation = useMutation({
    mutationFn: async (data: UpdateGitProviderRequest & { id: number }) => {
      const { id, ...updateData } = data;
      return await gitProvidersApi.updateProvider(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git-providers'] });
      handleClose();
    },
    onError: (error) => {
      console.error('Failed to update git provider:', error);
      setErrors({ submit: 'Failed to update git provider. Please check your connection and try again.' });
    }
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (data: { providerType: string; baseUrl: string; accessToken: string }) => {
      return await gitProvidersApi.testConnection({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        providerType: data.providerType as any,
        baseUrl: data.baseUrl,
        accessToken: data.accessToken,
      });
    },
    onSuccess: (result) => {
      setConnectionTestResult({
        success: result.isSuccessful,
        message: result.message,
        userInfo: result.userInfo,
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

    // Access token validation (only if provided - optional for updates)
    if (formData.accessToken && formData.accessToken.length < 10) {
      newErrors.accessToken = 'Access token seems too short';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleInputChange = useCallback((field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear specific field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Clear connection test result when connection-related fields change
    if (['baseUrl', 'accessToken'].includes(field as string)) {
      setConnectionTestResult(null);
    }
  }, [errors]);

  const handleTestConnection = useCallback(async () => {
    if (!provider) return;
    if (!formData.accessToken) {
      setErrors(prev => ({ ...prev, accessToken: 'Access token is required to test connection' }));
      return;
    }

    const newErrors: FormErrors = {};

    // Validate base URL
    if (!formData.baseUrl.trim()) {
      newErrors.baseUrl = 'Base URL is required';
    } else {
      try {
        new URL(formData.baseUrl);
      } catch {
        newErrors.baseUrl = 'Please enter a valid URL';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsTestingConnection(true);
    setConnectionTestResult(null);

    testConnectionMutation.mutate({
      providerType: provider.providerType,
      baseUrl: formData.baseUrl.trim(),
      accessToken: formData.accessToken.trim(),
    });
  }, [formData, provider, testConnectionMutation]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider) return;

    if (!validateForm()) return;

    const updateData: UpdateGitProviderRequest & { id: number } = {
      id: provider.id,
      name: formData.name.trim(),
      baseUrl: formData.baseUrl.trim(),
      isActive: formData.isActive,
    };

    // Only include access token if it was changed
    if (formData.accessToken.trim()) {
      updateData.accessToken = formData.accessToken.trim();
    }

    updateProviderMutation.mutate(updateData);
  }, [formData, provider, validateForm, updateProviderMutation]);

  const handleClose = useCallback(() => {
    if (updateProviderMutation.isPending) return;

    setFormData({
      name: '',
      baseUrl: '',
      accessToken: '',
      isActive: true,
    });
    setErrors({});
    setShowAccessToken(false);
    setConnectionTestResult(null);
    setIsTestingConnection(false);
    onClose();
  }, [updateProviderMutation.isPending, onClose]);

  // Handle ESC key to close modal
  useEscapeKey(handleClose, isOpen && !updateProviderMutation.isPending);

  if (!isOpen || !provider) return null;

  const getProviderIcon = () => {
    switch (provider.providerType) {
      case 'GitHub': return '🐙';
      case 'GitLab': return '🦊';
      case 'Gitea': return '🍵';
      default: return '📦';
    }
  };

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
                Edit Git Provider
              </h2>
              <p className={`text-sm ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {getProviderIcon()} {provider.providerType}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={updateProviderMutation.isPending}
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
              disabled={updateProviderMutation.isPending}
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
              disabled={updateProviderMutation.isPending}
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
          </div>

          {/* Access Token */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Access Token <span className="text-sm font-normal text-gray-500">(leave empty to keep current)</span>
            </label>
            <div className="relative">
              <input
                type={showAccessToken ? 'text' : 'password'}
                value={formData.accessToken}
                onChange={(e) => handleInputChange('accessToken', e.target.value)}
                placeholder="Enter new token to update"
                disabled={updateProviderMutation.isPending}
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
                disabled={updateProviderMutation.isPending}
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
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between">
            <div>
              <label className={`block text-sm font-medium ${
                darkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Provider Status
              </label>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Inactive providers won't be used for deployments
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                disabled={updateProviderMutation.isPending}
                className="sr-only peer"
              />
              <div className={`w-11 h-6 rounded-full peer transition-colors ${
                darkMode
                  ? 'bg-gray-700 peer-checked:bg-purple-600'
                  : 'bg-gray-300 peer-checked:bg-purple-500'
              } peer-focus:ring-2 peer-focus:ring-purple-500/20 peer-disabled:opacity-50`}>
                <div className={`absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  formData.isActive ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
              <span className={`ml-3 text-sm font-medium ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {formData.isActive ? 'Active' : 'Inactive'}
              </span>
            </label>
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
              disabled={updateProviderMutation.isPending || isTestingConnection || !formData.accessToken}
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
              <span className="ml-2">Test</span>
            </button>

            <button
              type="submit"
              disabled={updateProviderMutation.isPending || isTestingConnection}
              className={`flex items-center justify-center flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                darkMode
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-600/25'
                  : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg shadow-purple-500/25'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {updateProviderMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className="ml-2">
                {updateProviderMutation.isPending ? 'Saving...' : 'Save Changes'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
