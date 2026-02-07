import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  X,
  Monitor,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy,
  Terminal,
  HardDrive,
  Cpu,
  MemoryStick
} from 'lucide-react';
import { vmManagementApi } from '../../services/vmManagementApi';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useVMOperationUpdates } from '../../hooks/useVMOperationUpdates';
import type {
  CreateVMRequest,
  VMPreset,
  VmOsType,
  VMOperation,
  VMOperationStatus
} from '../../types/VirtualMachine';

interface CreateVMModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

interface FormData {
  hostServerId: number | null;
  vmName: string;
  osType: VmOsType;
  preset: VMPreset;
  username: string;
  password: string;
  confirmPassword: string;
  diskSizeGb: string;
}

interface FormErrors {
  [key: string]: string;
}

const PRESET_CONFIG: Record<VMPreset, { ram: number; vcpus: number; label: string; description: string }> = {
  Small: { ram: 4096, vcpus: 2, label: 'Small', description: '4GB RAM, 2 vCPUs' },
  Medium: { ram: 8192, vcpus: 4, label: 'Medium', description: '8GB RAM, 4 vCPUs' },
  Large: { ram: 16384, vcpus: 8, label: 'Large', description: '16GB RAM, 8 vCPUs' },
  Custom: { ram: 0, vcpus: 0, label: 'Custom', description: 'Custom Configuration' }
};

const OS_CONFIG: Record<VmOsType, { label: string; description: string }> = {
  Ubuntu2404: { label: 'Ubuntu 24.04 LTS', description: 'Noble Numbat - Latest LTS' },
  Ubuntu2204: { label: 'Ubuntu 22.04 LTS', description: 'Jammy Jellyfish - Stable LTS' },
  Debian12: { label: 'Debian 12', description: 'Bookworm - Stable' },
  KaliLinux: { label: 'Kali Linux', description: 'Security Testing Distribution' }
};

const DEFAULT_FORM_DATA: FormData = {
  hostServerId: null,
  vmName: '',
  osType: 'Ubuntu2404',
  preset: 'Small',
  username: '',
  password: '',
  confirmPassword: '',
  diskSizeGb: '50'
};

type ModalView = 'form' | 'progress';

export const CreateVMModal: React.FC<CreateVMModalProps> = ({
  isOpen,
  onClose,
  darkMode = true
}) => {
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<VMOperation | null>(null);
  const [view, setView] = useState<ModalView>('form');
  const [copied, setCopied] = useState(false);

  const queryClient = useQueryClient();

  // Fetch Unraid servers
  const { data: unraidServers = [], isLoading: serversLoading } = useQuery({
    queryKey: ['unraid-servers'],
    queryFn: () => vmManagementApi.getUnraidServers(),
    enabled: isOpen
  });

  // Fetch available images (for future use showing download status)
  useQuery({
    queryKey: ['vm-images'],
    queryFn: () => vmManagementApi.getAvailableImages(),
    enabled: isOpen
  });

  // Poll for operation status when we have an operation
  const { data: operationStatus } = useQuery({
    queryKey: ['vm-operation', currentOperation?.operationId],
    queryFn: () => vmManagementApi.getOperation(currentOperation!.operationId),
    enabled: !!currentOperation && view === 'progress',
    refetchInterval: (query) => {
      // Stop polling when operation is complete
      const data = query.state.data;
      if (data?.status === 'Ready' || data?.status === 'Failed' || data?.status === 'Cancelled') {
        return false;
      }
      return 2000; // Poll every 2 seconds
    }
  });

  // Use SignalR for real-time updates
  useVMOperationUpdates({
    operationId: currentOperation?.operationId,
    onComplete: () => {
      queryClient.invalidateQueries({ queryKey: ['vm-operations'] });
      queryClient.invalidateQueries({ queryKey: ['managed-servers'] });
    }
  });

  // Update current operation from polling
  useEffect(() => {
    if (operationStatus) {
      setCurrentOperation(operationStatus);
    }
  }, [operationStatus]);

  // Set default server when servers load
  useEffect(() => {
    if (unraidServers.length > 0 && !formData.hostServerId) {
      setFormData(prev => ({ ...prev, hostServerId: unraidServers[0].id }));
    }
  }, [unraidServers, formData.hostServerId]);

  // Close modal with escape key (only in form view)
  useEscapeKey(() => {
    if (view === 'form') {
      handleClose();
    }
  }, isOpen);

  const handleClose = () => {
    if (view === 'progress' && currentOperation?.status !== 'Ready' && currentOperation?.status !== 'Failed' && currentOperation?.status !== 'Cancelled') {
      // Don't close if operation is in progress
      return;
    }
    setFormData(DEFAULT_FORM_DATA);
    setErrors({});
    setCurrentOperation(null);
    setView('form');
    setCopied(false);
    onClose();
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.hostServerId) {
      newErrors.hostServerId = 'Please select an Unraid server';
    }

    if (!formData.vmName.trim()) {
      newErrors.vmName = 'VM name is required';
    } else if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(formData.vmName)) {
      newErrors.vmName = 'VM name must start with a letter and contain only letters, numbers, and hyphens';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (!/^[a-z_][a-z0-9_-]*$/.test(formData.username)) {
      newErrors.username = 'Username must be lowercase and start with a letter or underscore';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    const diskSize = parseInt(formData.diskSizeGb);
    if (isNaN(diskSize) || diskSize < 10 || diskSize > 2000) {
      newErrors.diskSizeGb = 'Disk size must be between 10 and 2000 GB';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createVMMutation = useMutation({
    mutationFn: (request: CreateVMRequest) => vmManagementApi.createVM(request),
    onSuccess: (operation) => {
      setCurrentOperation(operation);
      setView('progress');
      queryClient.invalidateQueries({ queryKey: ['vm-operations'] });
    },
    onError: (error: Error) => {
      setErrors({ submit: error.message || 'Failed to create VM' });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const request: CreateVMRequest = {
      hostServerId: formData.hostServerId!,
      vmName: formData.vmName,
      osType: formData.osType,
      preset: formData.preset,
      username: formData.username,
      password: formData.password,
      diskSizeGb: parseInt(formData.diskSizeGb)
    };

    createVMMutation.mutate(request);
  };

  const handleInputChange = (field: keyof FormData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStatusColor = (status: VMOperationStatus): string => {
    switch (status) {
      case 'Ready': return 'text-green-400';
      case 'Failed': return 'text-red-400';
      case 'Cancelled': return 'text-gray-400';
      default: return 'text-blue-400';
    }
  };

  const getProgressBarColor = (status: VMOperationStatus): string => {
    switch (status) {
      case 'Ready': return 'bg-green-500';
      case 'Failed': return 'bg-red-500';
      case 'Cancelled': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={view === 'form' ? handleClose : undefined}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-2xl rounded-xl shadow-2xl ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              darkMode ? 'bg-blue-500/20' : 'bg-blue-100'
            }`}>
              <Monitor className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {view === 'form' ? 'Create Virtual Machine' : 'Creating VM'}
              </h2>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {view === 'form'
                  ? 'Deploy a new VM on your Unraid server'
                  : currentOperation?.vmName}
              </p>
            </div>
          </div>
          {(view === 'form' || currentOperation?.status === 'Ready' || currentOperation?.status === 'Failed') && (
            <button
              onClick={handleClose}
              className={`p-2 rounded-lg transition-colors ${
                darkMode
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {view === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Server Selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Unraid Server *
                </label>
                {serversLoading ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading servers...
                  </div>
                ) : unraidServers.length === 0 ? (
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>
                    <div className="flex items-center gap-2 text-yellow-500">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">No Unraid servers found. Please add an Unraid server first.</span>
                    </div>
                  </div>
                ) : (
                  <select
                    value={formData.hostServerId || ''}
                    onChange={(e) => handleInputChange('hostServerId', parseInt(e.target.value))}
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                        : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    } ${errors.hostServerId ? 'border-red-500' : ''}`}
                  >
                    {unraidServers.map(server => (
                      <option key={server.id} value={server.id}>
                        {server.name} ({server.hostAddress})
                      </option>
                    ))}
                  </select>
                )}
                {errors.hostServerId && (
                  <p className="mt-1 text-sm text-red-500">{errors.hostServerId}</p>
                )}
              </div>

              {/* VM Name */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  VM Name *
                </label>
                <input
                  type="text"
                  value={formData.vmName}
                  onChange={(e) => handleInputChange('vmName', e.target.value)}
                  placeholder="my-ubuntu-vm"
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                  } ${errors.vmName ? 'border-red-500' : ''}`}
                />
                {errors.vmName && (
                  <p className="mt-1 text-sm text-red-500">{errors.vmName}</p>
                )}
              </div>

              {/* OS Selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Operating System *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.entries(OS_CONFIG) as [VmOsType, typeof OS_CONFIG[VmOsType]][]).map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleInputChange('osType', key)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        formData.osType === key
                          ? darkMode
                            ? 'border-blue-500 bg-blue-500/20'
                            : 'border-blue-500 bg-blue-50'
                          : darkMode
                            ? 'border-gray-600 bg-gray-700 hover:border-gray-500'
                            : 'border-gray-300 bg-white hover:border-gray-400'
                      }`}
                    >
                      <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {config.label}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {config.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preset Selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Size Preset *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['Small', 'Medium', 'Large'] as VMPreset[]).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleInputChange('preset', preset)}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        formData.preset === preset
                          ? darkMode
                            ? 'border-blue-500 bg-blue-500/20'
                            : 'border-blue-500 bg-blue-50'
                          : darkMode
                            ? 'border-gray-600 bg-gray-700 hover:border-gray-500'
                            : 'border-gray-300 bg-white hover:border-gray-400'
                      }`}
                    >
                      <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {PRESET_CONFIG[preset].label}
                      </div>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <MemoryStick className="w-3 h-3 text-gray-400" />
                        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {PRESET_CONFIG[preset].ram / 1024}GB
                        </span>
                        <Cpu className="w-3 h-3 text-gray-400 ml-2" />
                        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {PRESET_CONFIG[preset].vcpus}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Disk Size */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    Disk Size (GB)
                  </div>
                </label>
                <input
                  type="number"
                  value={formData.diskSizeGb}
                  onChange={(e) => handleInputChange('diskSizeGb', e.target.value)}
                  min="10"
                  max="2000"
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  } ${errors.diskSizeGb ? 'border-red-500' : ''}`}
                />
                {errors.diskSizeGb && (
                  <p className="mt-1 text-sm text-red-500">{errors.diskSizeGb}</p>
                )}
              </div>

              {/* Credentials */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-200' : 'text-gray-700'
                  }`}>
                    Username *
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value.toLowerCase())}
                    placeholder="ubuntu"
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                    } ${errors.username ? 'border-red-500' : ''}`}
                  />
                  {errors.username && (
                    <p className="mt-1 text-sm text-red-500">{errors.username}</p>
                  )}
                </div>
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
                      placeholder="Strong password"
                      className={`w-full px-4 py-2 pr-10 rounded-lg border transition-colors ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                      } ${errors.password ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                  )}
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Confirm Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirm password"
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                  } ${errors.confirmPassword ? 'border-red-500' : ''}`}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Submit Error */}
              {errors.submit && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{errors.submit}</span>
                  </div>
                </div>
              )}
            </form>
          ) : (
            /* Progress View */
            <div className="space-y-6">
              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${getStatusColor(currentOperation?.status || 'Pending')}`}>
                    {currentOperation?.currentStage || 'Initializing...'}
                  </span>
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {currentOperation?.progressPercent || 0}%
                  </span>
                </div>
                <div className={`w-full h-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor(currentOperation?.status || 'Pending')}`}
                    style={{ width: `${currentOperation?.progressPercent || 0}%` }}
                  />
                </div>
              </div>

              {/* Status Details */}
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Status</div>
                    <div className={`font-medium flex items-center gap-2 ${getStatusColor(currentOperation?.status || 'Pending')}`}>
                      {currentOperation?.status === 'Ready' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : currentOperation?.status === 'Failed' ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      {currentOperation?.status || 'Pending'}
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>OS</div>
                    <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {OS_CONFIG[currentOperation?.osType || 'Ubuntu2404']?.label}
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Resources</div>
                    <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {(currentOperation?.ramMb || 0) / 1024}GB RAM, {currentOperation?.vCpus || 0} vCPUs
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Disk</div>
                    <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {currentOperation?.diskSizeGb || 50}GB
                    </div>
                  </div>
                </div>
              </div>

              {/* Success Info */}
              {currentOperation?.status === 'Ready' && currentOperation.ipAddress && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
                  <div className="flex items-center gap-2 text-green-500 mb-3">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">VM Created Successfully!</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>IP Address</div>
                      <div className={`font-mono text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {currentOperation.ipAddress}
                      </div>
                    </div>

                    <div>
                      <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>SSH Connection</div>
                      <div className={`flex items-center gap-2 p-2 rounded ${
                        darkMode ? 'bg-black/30' : 'bg-gray-100'
                      }`}>
                        <Terminal className="w-4 h-4 text-gray-400" />
                        <code className={`font-mono text-sm flex-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {currentOperation.sshConnectionString}
                        </code>
                        <button
                          onClick={() => copyToClipboard(currentOperation.sshConnectionString!)}
                          className={`p-1 rounded transition-colors ${
                            copied
                              ? 'text-green-500'
                              : darkMode
                                ? 'text-gray-400 hover:text-white'
                                : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Info */}
              {currentOperation?.status === 'Failed' && currentOperation.errorMessage && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
                  <div className="flex items-center gap-2 text-red-500 mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">VM Creation Failed</span>
                  </div>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {currentOperation.errorMessage}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          {view === 'form' ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={createVMMutation.isPending || unraidServers.length === 0}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  createVMMutation.isPending || unraidServers.length === 0
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {createVMMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Create VM
              </button>
            </>
          ) : (
            <button
              onClick={handleClose}
              disabled={currentOperation?.status !== 'Ready' && currentOperation?.status !== 'Failed' && currentOperation?.status !== 'Cancelled'}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentOperation?.status !== 'Ready' && currentOperation?.status !== 'Failed' && currentOperation?.status !== 'Cancelled'
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {currentOperation?.status === 'Ready' ? 'Done' : 'Close'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
