import React, { useState, useEffect } from 'react';
import { X, Server, Key, Loader2, AlertCircle, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sshCredentialsApi } from '../../services/sshCredentialsApi';
import { serversApi } from '../../services/serversApi';
import type { CreateServerRequest } from '../../services/serversApi';
import type { DiscoveredService, StoredDiscoveredService } from '../../types/networkDiscovery';

interface AddServerFromDiscoveryModalProps {
  darkMode?: boolean;
  service: DiscoveredService | StoredDiscoveredService;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddServerFromDiscoveryModal: React.FC<AddServerFromDiscoveryModalProps> = ({
  darkMode = true,
  service,
  onClose,
  onSuccess
}) => {
  const queryClient = useQueryClient();
  const [selectedCredentialId, setSelectedCredentialId] = useState<number | null>(null);
  const [useCustomCredentials, setUseCustomCredentials] = useState(false);
  const [customCredentials, setCustomCredentials] = useState({
    username: '',
    password: '',
    saveCredentials: false,
    credentialName: ''
  });
  const [serverName, setServerName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch available SSH credentials
  const { data: credentials = [], isLoading: credentialsLoading } = useQuery({
    queryKey: ['sshCredentials'],
    queryFn: () => sshCredentialsApi.getCredentials()
  });

  // Set default values
  useEffect(() => {
    // Auto-generate server name based on service
    const defaultName = `${service.hostAddress}:${service.port}`;
    setServerName(defaultName);

    // Set description based on service info
    const defaultDescription = `SSH Server discovered on ${service.hostAddress}`;
    setDescription(defaultDescription);

    // Auto-set default credential if available
    const defaultCredential = credentials.find(c => c.isDefault);
    if (defaultCredential) {
      setSelectedCredentialId(defaultCredential.id);
    }
  }, [service, credentials]);

  // Create server mutation
  const createServerMutation = useMutation({
    mutationFn: async (data: CreateServerRequest) => {
      // If using custom credentials and user wants to save them, create credential first
      if (useCustomCredentials && customCredentials.saveCredentials) {
        const newCredential = await sshCredentialsApi.createCredential({
          name: customCredentials.credentialName || `Credentials for ${service.hostAddress}`,
          username: customCredentials.username,
          password: customCredentials.password,
          description: `Created from discovered service ${service.hostAddress}:${service.port}`,
          defaultPort: service.port,
          isDefault: false
        });
        data.sshCredentialId = newCredential.id;
      }

      return serversApi.createServer(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['sshCredentials'] });
      onSuccess?.();
      onClose();
    }
  });

  // Test connection
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);

    try {
      let result;
      if (useCustomCredentials) {
        // Test with custom credentials
        result = await serversApi.testConnection({
          hostAddress: service.hostAddress,
          port: service.port,
          username: customCredentials.username,
          password: customCredentials.password
        });
      } else if (selectedCredentialId) {
        // Test with selected credential
        result = await sshCredentialsApi.testCredential(selectedCredentialId, {
          hostAddress: service.hostAddress,
          port: service.port
        });
      } else {
        setConnectionTestResult({ success: false, message: 'Please select credentials' });
        return;
      }

      setConnectionTestResult(result);
    } catch (error: any) {
      setConnectionTestResult({
        success: false,
        message: error.response?.data?.message || 'Connection test failed'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const serverData: CreateServerRequest = {
      name: serverName,
      description,
      ipAddress: service.hostAddress,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      sshPort: service.port,
      sshCredentialId: useCustomCredentials ? undefined : selectedCredentialId || undefined,
      customSshUsername: useCustomCredentials ? customCredentials.username : undefined,
      customSshPassword: useCustomCredentials ? customCredentials.password : undefined
    };

    createServerMutation.mutate(serverData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`relative w-full max-w-2xl mx-4 rounded-xl shadow-xl ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center space-x-3">
            <Server className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Add SSH Server
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              darkMode
                ? 'hover:bg-gray-700 text-gray-400'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Service Info */}
          <div className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-900' : 'bg-gray-50'
          }`}>
            <h3 className={`text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Discovered Service
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Host: </span>
                <span className={darkMode ? 'text-white' : 'text-gray-900'}>{service.hostAddress}</span>
              </div>
              <div>
                <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Port: </span>
                <span className={darkMode ? 'text-white' : 'text-gray-900'}>{service.port}</span>
              </div>
              <div>
                <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Service: </span>
                <span className={darkMode ? 'text-white' : 'text-gray-900'}>{service.serviceType}</span>
              </div>
              <div>
                <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Status: </span>
                <span className={`${service.isReachable
                  ? darkMode ? 'text-green-400' : 'text-green-600'
                  : darkMode ? 'text-red-400' : 'text-red-600'
                }`}>
                  {service.isReachable ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Server Details */}
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Server Name
              </label>
              <input
                type="text"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-900 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className={`w-full px-3 py-2 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-900 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="production, web, critical"
                className={`w-full px-3 py-2 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-900 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
          </div>

          {/* SSH Credentials Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className={`text-sm font-medium ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                SSH Credentials
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!useCustomCredentials}
                    onChange={() => setUseCustomCredentials(false)}
                    className="form-radio"
                  />
                  <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Saved Credentials
                  </span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={useCustomCredentials}
                    onChange={() => setUseCustomCredentials(true)}
                    className="form-radio"
                  />
                  <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Custom Credentials
                  </span>
                </label>
              </div>
            </div>

            {!useCustomCredentials ? (
              <div>
                {credentialsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : credentials.length === 0 ? (
                  <div className={`p-4 rounded-lg border ${
                    darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <p className={`text-sm text-center ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      No saved credentials. Add credentials in Settings or use custom credentials.
                    </p>
                  </div>
                ) : (
                  <select
                    value={selectedCredentialId || ''}
                    onChange={(e) => setSelectedCredentialId(e.target.value ? parseInt(e.target.value) : null)}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-900 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    required={!useCustomCredentials}
                  >
                    <option value="">Select credentials...</option>
                    {credentials.map(credential => (
                      <option key={credential.id} value={credential.id}>
                        {credential.name} ({credential.username})
                        {credential.isDefault && ' - Default'}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Username
                    </label>
                    <input
                      type="text"
                      value={customCredentials.username}
                      onChange={(e) => setCustomCredentials({ ...customCredentials, username: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        darkMode
                          ? 'bg-gray-900 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      required={useCustomCredentials}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Password
                    </label>
                    <input
                      type="password"
                      value={customCredentials.password}
                      onChange={(e) => setCustomCredentials({ ...customCredentials, password: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        darkMode
                          ? 'bg-gray-900 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      required={useCustomCredentials}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={customCredentials.saveCredentials}
                      onChange={(e) => setCustomCredentials({
                        ...customCredentials,
                        saveCredentials: e.target.checked
                      })}
                      className="rounded"
                    />
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Save these credentials for future use
                    </span>
                  </label>

                  {customCredentials.saveCredentials && (
                    <input
                      type="text"
                      value={customCredentials.credentialName}
                      onChange={(e) => setCustomCredentials({
                        ...customCredentials,
                        credentialName: e.target.value
                      })}
                      placeholder="Credential name (optional)"
                      className={`w-full px-3 py-2 rounded-lg border ${
                        darkMode
                          ? 'bg-gray-900 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Test Connection Button and Result */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection || (!selectedCredentialId && !useCustomCredentials) ||
                         (useCustomCredentials && (!customCredentials.username || !customCredentials.password))}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-500'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900 disabled:bg-gray-100 disabled:text-gray-400'
                } disabled:cursor-not-allowed`}
              >
                {testingConnection ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>Test Connection</span>
                  </>
                )}
              </button>

              {connectionTestResult && (
                <div className={`p-3 rounded-lg flex items-center space-x-2 ${
                  connectionTestResult.success
                    ? darkMode
                      ? 'bg-green-900/20 text-green-400 border border-green-500/30'
                      : 'bg-green-100 text-green-800 border border-green-200'
                    : darkMode
                      ? 'bg-red-900/20 text-red-400 border border-red-500/30'
                      : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {connectionTestResult.success ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span className="text-sm">{connectionTestResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createServerMutation.isPending ||
                       (!selectedCredentialId && !useCustomCredentials) ||
                       (useCustomCredentials && (!customCredentials.username || !customCredentials.password))}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-700 disabled:text-gray-500'
                  : 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 disabled:text-gray-500'
              } disabled:cursor-not-allowed`}
            >
              {createServerMutation.isPending ? (
                <span className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Adding Server...</span>
                </span>
              ) : (
                'Add Server'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};