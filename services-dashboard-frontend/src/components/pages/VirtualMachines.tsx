import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Monitor,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Server,
  Cpu,
  MemoryStick,
  HardDrive,
  Terminal,
  Copy,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { vmManagementApi } from '../../services/vmManagementApi';
import { CreateVMModal } from '../modals/CreateVMModal';
import { useVMOperationUpdates } from '../../hooks/useVMOperationUpdates';
import type { VMOperationStatus, VmOsType } from '../../types/VirtualMachine';

interface VirtualMachinesProps {
  darkMode?: boolean;
}

const OS_LABELS: Record<VmOsType, string> = {
  Ubuntu2404: 'Ubuntu 24.04',
  Ubuntu2204: 'Ubuntu 22.04',
  Debian12: 'Debian 12',
  KaliLinux: 'Kali Linux'
};

const getStatusIcon = (status: VMOperationStatus) => {
  switch (status) {
    case 'Ready':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'Failed':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'Cancelled':
      return <XCircle className="w-4 h-4 text-gray-500" />;
    case 'Pending':
      return <Clock className="w-4 h-4 text-gray-400" />;
    default:
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
  }
};

const getStatusColor = (status: VMOperationStatus, darkMode: boolean): string => {
  switch (status) {
    case 'Ready':
      return darkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200';
    case 'Failed':
      return darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200';
    case 'Cancelled':
      return darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200';
    default:
      return darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200';
  }
};

export const VirtualMachines: React.FC<VirtualMachinesProps> = ({ darkMode = true }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch VM operations
  const { data: operations = [], isLoading, refetch } = useQuery({
    queryKey: ['vm-operations'],
    queryFn: () => vmManagementApi.getOperations(),
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Use SignalR for real-time updates
  useVMOperationUpdates({
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ['vm-operations'] });
    }
  });

  // Cancel operation mutation
  const cancelMutation = useMutation({
    mutationFn: (operationId: string) => vmManagementApi.cancelOperation(operationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vm-operations'] });
    }
  });

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const activeOperations = operations.filter(op =>
    op.status !== 'Ready' && op.status !== 'Failed' && op.status !== 'Cancelled'
  );

  const completedOperations = operations.filter(op =>
    op.status === 'Ready' || op.status === 'Failed' || op.status === 'Cancelled'
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Virtual Machines
          </h1>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Create and manage VMs on your Unraid servers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className={`p-2 rounded-lg transition-colors ${
              darkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create VM
          </button>
        </div>
      </div>

      {/* Active Operations */}
      {activeOperations.length > 0 && (
        <div className="space-y-4">
          <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Active Operations
          </h2>
          <div className="grid gap-4">
            {activeOperations.map(operation => (
              <div
                key={operation.id}
                className={`p-4 rounded-lg border ${getStatusColor(operation.status, darkMode)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(operation.status)}
                    <div>
                      <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {operation.vmName}
                      </div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {operation.currentStage || 'Initializing...'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => cancelMutation.mutate(operation.operationId)}
                    disabled={cancelMutation.isPending}
                    className={`p-2 rounded-lg transition-colors ${
                      darkMode
                        ? 'hover:bg-gray-700 text-gray-400 hover:text-red-400'
                        : 'hover:bg-gray-200 text-gray-500 hover:text-red-500'
                    }`}
                    title="Cancel operation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Progress
                    </span>
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {operation.progressPercent}%
                    </span>
                  </div>
                  <div className={`w-full h-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${operation.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <Server className="w-3 h-3 text-gray-400" />
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                      {operation.hostServer?.name || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Monitor className="w-3 h-3 text-gray-400" />
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                      {OS_LABELS[operation.osType] || operation.osType}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed VMs */}
      <div className="space-y-4">
        <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {activeOperations.length > 0 ? 'Completed' : 'VM Operations'}
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : completedOperations.length === 0 && activeOperations.length === 0 ? (
          <div className={`text-center py-12 rounded-lg border ${
            darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
          }`}>
            <Monitor className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              No VMs Created Yet
            </h3>
            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Create your first virtual machine on an Unraid server
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create VM
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {completedOperations.map(operation => (
              <div
                key={operation.id}
                className={`p-4 rounded-lg border ${getStatusColor(operation.status, darkMode)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(operation.status)}
                    <div>
                      <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {operation.vmName}
                      </div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {operation.status === 'Ready'
                          ? 'VM created successfully'
                          : operation.status === 'Failed'
                            ? operation.errorMessage || 'VM creation failed'
                            : 'Operation cancelled'}
                      </div>
                    </div>
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {formatDate(operation.completedAt || operation.createdAt)}
                  </div>
                </div>

                {operation.status === 'Ready' && operation.ipAddress && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <MemoryStick className="w-4 h-4 text-gray-400" />
                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {operation.ramMb / 1024}GB
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-gray-400" />
                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {operation.vCpus} vCPUs
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-gray-400" />
                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {operation.diskSizeGb}GB
                        </span>
                      </div>
                    </div>

                    <div className={`flex items-center gap-2 p-2 rounded ${
                      darkMode ? 'bg-black/30' : 'bg-gray-100'
                    }`}>
                      <Terminal className="w-4 h-4 text-gray-400" />
                      <code className={`font-mono text-sm flex-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {operation.sshConnectionString}
                      </code>
                      <button
                        onClick={() => copyToClipboard(operation.sshConnectionString!, operation.operationId)}
                        className={`p-1 rounded transition-colors ${
                          copiedId === operation.operationId
                            ? 'text-green-500'
                            : darkMode
                              ? 'text-gray-400 hover:text-white'
                              : 'text-gray-500 hover:text-gray-700'
                        }`}
                        title="Copy SSH command"
                      >
                        {copiedId === operation.operationId ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {operation.status === 'Failed' && operation.errorMessage && (
                  <div className={`mt-3 p-3 rounded text-sm ${
                    darkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'
                  }`}>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{operation.errorMessage}</span>
                    </div>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <Server className="w-3 h-3 text-gray-400" />
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                      {operation.hostServer?.name || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Monitor className="w-3 h-3 text-gray-400" />
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                      {OS_LABELS[operation.osType] || operation.osType}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create VM Modal */}
      <CreateVMModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        darkMode={darkMode}
      />
    </div>
  );
};
