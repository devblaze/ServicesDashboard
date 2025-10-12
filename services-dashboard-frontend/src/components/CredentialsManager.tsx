import React, { useState } from 'react';
import {
  Key, Plus, Trash2,
  Eye, EyeOff, User, Server, AlertCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sshCredentialsApi } from '../services/sshCredentialsApi';
import type { SshCredential, CreateSshCredentialRequest } from '../services/sshCredentialsApi';

interface CredentialsManagerProps {
  darkMode?: boolean;
  onCredentialSelect?: (credential: SshCredential) => void;
  selectMode?: boolean;
}

export const CredentialsManager: React.FC<CredentialsManagerProps> = ({
  darkMode = true,
  onCredentialSelect,
  selectMode = false
}) => {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPassword, setShowPassword] = useState<{ [key: number]: boolean }>({});
  const [formData, setFormData] = useState<CreateSshCredentialRequest>({
    name: '',
    username: '',
    password: '',
    description: '',
    defaultPort: 22,
    isDefault: false
  });

  // Fetch credentials
  const { data: credentials = [], isLoading, error } = useQuery({
    queryKey: ['sshCredentials'],
    queryFn: () => sshCredentialsApi.getCredentials()
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateSshCredentialRequest) => sshCredentialsApi.createCredential(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sshCredentials'] });
      setShowAddForm(false);
      resetForm();
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => sshCredentialsApi.deleteCredential(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sshCredentials'] });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      username: '',
      password: '',
      description: '',
      defaultPort: 22,
      isDefault: false
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.username && formData.password) {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this credential?')) {
      deleteMutation.mutate(id);
    }
  };

  const togglePasswordVisibility = (id: number) => {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-500">
        <AlertCircle className="w-5 h-5 mr-2" />
        Error loading credentials
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-6 ${
      darkMode
        ? 'bg-gray-800/50 border-gray-700'
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-xl font-semibold mb-1 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            SSH Credentials Manager
          </h2>
          <p className={`text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Manage your SSH credentials for quick server access
          </p>
        </div>
        {!selectMode && (
          <button
            onClick={() => setShowAddForm(true)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              darkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add Credential</span>
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className={`mb-6 p-4 rounded-lg border ${
          darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Credential Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    darkMode
                      ? 'bg-gray-800 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="e.g., Production SSH"
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    darkMode
                      ? 'bg-gray-800 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="root"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword[-1] ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border pr-10 ${
                      darkMode
                        ? 'bg-gray-800 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(-1)}
                    className={`absolute right-2 top-2.5 ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {showPassword[-1] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Default Port
                </label>
                <input
                  type="number"
                  value={formData.defaultPort}
                  onChange={(e) => setFormData({ ...formData, defaultPort: parseInt(e.target.value) })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    darkMode
                      ? 'bg-gray-800 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="22"
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Description (Optional)
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Credentials for production servers"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="isDefault" className={`text-sm ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Set as default credential
              </label>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  darkMode
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  darkMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                } disabled:opacity-50`}
              >
                {createMutation.isPending ? 'Saving...' : 'Save Credential'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Credentials List */}
      <div className="space-y-3">
        {credentials.length === 0 ? (
          <div className={`text-center py-8 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No credentials saved yet</p>
            <p className="text-sm mt-1">Add your first SSH credential to get started</p>
          </div>
        ) : (
          credentials.map(credential => (
            <div
              key={credential.id}
              className={`p-4 rounded-lg border transition-all ${
                darkMode
                  ? 'bg-gray-900 border-gray-700 hover:border-gray-600'
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
              } ${selectMode ? 'cursor-pointer' : ''}`}
              onClick={() => selectMode && onCredentialSelect?.(credential)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${
                    darkMode ? 'bg-gray-800' : 'bg-gray-200'
                  }`}>
                    <Key className={`w-5 h-5 ${
                      darkMode ? 'text-blue-400' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className={`font-medium ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {credential.name}
                      </h3>
                      {credential.isDefault && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          darkMode
                            ? 'bg-green-900 text-green-300'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          Default
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center space-x-4 text-sm mt-1 ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <span className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>{credential.username}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Server className="w-3 h-3" />
                        <span>Port {credential.defaultPort || 22}</span>
                      </span>
                      {credential.usageCount !== undefined && (
                        <span>{credential.usageCount} servers</span>
                      )}
                    </div>
                    {credential.description && (
                      <p className={`text-sm mt-1 ${
                        darkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        {credential.description}
                      </p>
                    )}
                  </div>
                </div>

                {!selectMode && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(credential.id);
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode
                          ? 'hover:bg-gray-800 text-gray-400 hover:text-red-400'
                          : 'hover:bg-gray-200 text-gray-600 hover:text-red-600'
                      }`}
                      disabled={!!(credential.usageCount && credential.usageCount > 0)}
                      title={credential.usageCount && credential.usageCount > 0
                        ? 'Cannot delete: credential is in use'
                        : 'Delete credential'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};