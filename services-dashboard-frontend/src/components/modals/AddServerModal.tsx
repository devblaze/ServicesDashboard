import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  X, 
  Server, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Wifi
} from 'lucide-react';
import { serverManagementApi } from '../../services/serverManagementApi';
import type { CreateServerDto, ServerType } from '../../types/ServerManagement';

interface AddServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

interface FormData {
  name: string;
  hostAddress: string;
  sshPort: string; // Form handles as string, convert to number when submitting
  username: string;
  password: string; // Separate from encryptedPassword for form handling
  type: ServerType;
  tags: string; // Change to string instead of string | null
}

interface FormErrors {
  [key: string]: string;
}

const SERVER_TYPES: { value: ServerType; label: string; icon: string }[] = [
  { value: 'Server', label: 'Server', icon: '🖥️' },
  { value: 'RaspberryPi', label: 'Raspberry Pi', icon: '🥧' },
  { value: 'VirtualMachine', label: 'Virtual Machine', icon: '💻' },
  { value: 'Container', label: 'Container', icon: '📦' },
];

const DEFAULT_FORM_DATA: FormData = {
  name: '',
  hostAddress: '',
  sshPort: '22',
  username: 'root',
  password: '',
  type: 'Server',
  tags: '',
};

export const AddServerModal: React.FC<AddServerModalProps> = ({ 
  isOpen, 
  onClose, 
  darkMode = true 
}) => {
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const queryClient = useQueryClient();

  // Add server mutation
  const addServerMutation = useMutation({
    mutationFn: async (data: CreateServerDto) => {
      return await serverManagementApi.addServer(data);
    },
    onSuccess: () => {
      // Invalidate and refetch servers list
      queryClient.invalidateQueries({ queryKey: ['managed-servers'] });
      queryClient.invalidateQueries({ queryKey: ['server-alerts'] });
      
      // Reset form and close modal
      handleClose();
    },
    onError: (error) => {
      console.error('Failed to add server:', error);
      setErrors({ submit: 'Failed to add server. Please check your connection and try again.' });
    }
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (serverData: CreateServerDto) => {
      // Create temporary server object for testing
      const tempServer = {
        id: 0, // Temporary ID
        ...serverData,
        status: 'Unknown' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastCheckTime: null,
        operatingSystem: null,
        systemInfo: null,
        healthChecks: [],
        updateReports: [],
        alerts: []
      };
      
      return await serverManagementApi.testNewServerConnection(tempServer);
    },
    onSuccess: (result) => {
      setConnectionTestResult({
        success: result,
        message: result 
          ? 'Connection successful! Server is reachable.' 
          : 'Connection failed. Please check your credentials and network settings.'
      });
      setIsTestingConnection(false);
    },
    onError: (error) => {
      console.error('Connection test failed:', error);
      setConnectionTestResult({
        success: false,
        message: 'Connection test failed. Please check your settings and try again.'
      });
      setIsTestingConnection(false);
    }
  });

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Server name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Server name must be at least 2 characters';
    }

    // Host address validation
    if (!formData.hostAddress.trim()) {
      newErrors.hostAddress = 'Host address is required';
    } else {
      // Basic IP/hostname validation
      const hostRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$|^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]$/;
      if (!hostRegex.test(formData.hostAddress)) {
        newErrors.hostAddress = 'Please enter a valid IP address or hostname';
      }
    }

    // SSH port validation
    const portNum = parseInt(formData.sshPort);
    if (!formData.sshPort || isNaN(portNum) || portNum < 1 || portNum > 65535) {
      newErrors.sshPort = 'Port must be between 1 and 65535';
    }

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    // Password validation
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleInputChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear specific field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Clear connection test result when connection-related fields change
    if (['hostAddress', 'sshPort', 'username', 'password'].includes(field)) {
      setConnectionTestResult(null);
    }
  }, [errors]);

  const handleTestConnection = useCallback(async () => {
    if (!validateForm()) return;

    setIsTestingConnection(true);
    setConnectionTestResult(null);

    const serverData: CreateServerDto = {
      name: formData.name.trim(),
      hostAddress: formData.hostAddress.trim(),
      sshPort: parseInt(formData.sshPort),
      username: formData.username.trim(),
      password: formData.password, // Will be encrypted by backend
      type: formData.type,
      tags: formData.tags.trim() || null,
    };

    testConnectionMutation.mutate(serverData);
  }, [formData, validateForm, testConnectionMutation]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const serverData: CreateServerDto = {
      name: formData.name.trim(),
      hostAddress: formData.hostAddress.trim(),
      sshPort: parseInt(formData.sshPort),
      username: formData.username.trim(),
      password: formData.password, // Will be encrypted by backend
      type: formData.type,
      tags: formData.tags.trim() || null,
    };

    addServerMutation.mutate(serverData);
  }, [formData, validateForm, addServerMutation]);

  const handleClose = useCallback(() => {
    if (addServerMutation.isPending) return; // Prevent closing during submission
    
    setFormData(DEFAULT_FORM_DATA);
    setErrors({});
    setShowPassword(false);
    setConnectionTestResult(null);
    setIsTestingConnection(false);
    onClose();
  }, [addServerMutation.isPending, onClose]);

  // Don't render if not open
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
              darkMode ? 'bg-blue-900/50' : 'bg-blue-100/50'
            }`}>
              <Server className={`w-5 h-5 ${
                darkMode ? 'text-blue-400' : 'text-blue-600'
              }`} />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Add Server
              </h2>
              <p className={`text-sm ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Configure a new server for monitoring
              </p>
            </div>
          </div>
          
          <button
            onClick={handleClose}
            disabled={addServerMutation.isPending}
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
          {/* Server Name */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Server Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="My Production Server"
              disabled={addServerMutation.isPending}
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

          {/* Host Address */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Host Address *
            </label>
            <input
              type="text"
              value={formData.hostAddress}
              onChange={(e) => handleInputChange('hostAddress', e.target.value)}
              placeholder="192.168.1.100 or server.example.com"
              disabled={addServerMutation.isPending}
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                darkMode
                  ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                  : 'bg-white/50 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
              } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                errors.hostAddress ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''
              }`}
            />
            {errors.hostAddress && (
              <p className="mt-1 text-sm text-red-400">{errors.hostAddress}</p>
            )}
          </div>

          {/* Server Type and SSH Port */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Server Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                disabled={addServerMutation.isPending}
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  darkMode
                    ? 'bg-gray-700/50 border-gray-600/50 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                    : 'bg-white/50 border-gray-300/50 text-gray-900 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {SERVER_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                SSH Port *
              </label>
              <input
                type="number"
                min="1"
                max="65535"
                value={formData.sshPort}
                onChange={(e) => handleInputChange('sshPort', e.target.value)}
                disabled={addServerMutation.isPending}
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  darkMode
                    ? 'bg-gray-700/50 border-gray-600/50 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                    : 'bg-white/50 border-gray-300/50 text-gray-900 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  errors.sshPort ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''
                }`}
              />
              {errors.sshPort && (
                <p className="mt-1 text-sm text-red-400">{errors.sshPort}</p>
              )}
            </div>
          </div>

          {/* Username */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Username *
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="root"
              disabled={addServerMutation.isPending}
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                darkMode
                  ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                  : 'bg-white/50 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
              } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                errors.username ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''
              }`}
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-400">{errors.username}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Enter SSH password"
                disabled={addServerMutation.isPending}
                className={`w-full px-3 py-2 pr-10 rounded-lg border transition-colors ${
                  darkMode
                    ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                    : 'bg-white/50 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  errors.password ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={addServerMutation.isPending}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${
                  darkMode
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-600 hover:text-gray-900'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-400">{errors.password}</p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Tags <span className="text-sm font-normal text-gray-500">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              placeholder="production, web, critical"
              disabled={addServerMutation.isPending}
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                darkMode
                  ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                  : 'bg-white/50 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
              } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            <p className={`mt-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Separate multiple tags with commas
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
              <div className="flex items-center space-x-2">
                {connectionTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
                <p className="text-sm font-medium">{connectionTestResult.message}</p>
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
              disabled={addServerMutation.isPending || isTestingConnection}
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
              disabled={addServerMutation.isPending || isTestingConnection}
              className={`flex items-center justify-center flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                darkMode
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-600/25'
                  : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {addServerMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Server className="w-4 h-4" />
              )}
              <span className="ml-2">
                {addServerMutation.isPending ? 'Adding Server...' : 'Add Server'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};