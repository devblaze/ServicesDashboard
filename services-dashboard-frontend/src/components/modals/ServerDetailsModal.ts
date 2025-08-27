
import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Settings,
  Terminal,
  FileText,
  Brain,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Copy,
  Play,
  Loader2,
  Wifi,
  Activity,
  Shield,
  Clock,
  Server,
  Cpu,
  MemoryStick,
  HardDrive
} from 'lucide-react';
import type { 
  ManagedServer, 
  CreateServerDto, 
  LogAnalysisResult, 
  CommandResult 
} from '../../types/ServerManagement';
import { serverManagementApi } from '../../services/serverManagementApi';

interface ServerDetailsModalProps {
  server: ManagedServer;
  darkMode: boolean;
  onClose: () => void;
  onUpdate: (server: ManagedServer) => void;
}

type TabType = 'overview' | 'edit' | 'logs' | 'terminal' | 'analysis';

export const ServerDetailsModal: React.FC<ServerDetailsModalProps> = ({
  server,
  darkMode,
  onClose,
  onUpdate
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [editForm, setEditForm] = useState<Partial<CreateServerDto>>({
    name: server.name,
    hostAddress: server.hostAddress,
    sshPort: server.sshPort || 22,
    username: server.username || '',
    password: '', // Don't pre-fill password
    type: server.type,
    tags: server.tags || ''
  });
  const [terminalCommand, setTerminalCommand] = useState('');
  const [terminalOutput, setTerminalOutput] = useState<CommandResult[]>([]);
  const [logAnalysis, setLogAnalysis] = useState<LogAnalysisResult | null>(null);
  
  const queryClient = useQueryClient();
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Fetch server logs
  const { 
    data: logs = '', 
    isLoading: logsLoading,
    refetch: refetchLogs 
  } = useQuery({
    queryKey: ['server-logs', server.id],
    queryFn: () => serverManagementApi.getServerLogs(server.id, 200),
    enabled: activeTab === 'logs' || activeTab === 'analysis',
    refetchInterval: activeTab === 'logs' ? 30000 : false, // Auto-refresh logs every 30 seconds
  });

  // Update server mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateServerDto>) => 
      serverManagementApi.updateServer(server.id, data),
    onSuccess: (updatedServer) => {
      queryClient.invalidateQueries({ queryKey: ['managed-servers'] });
      onUpdate(updatedServer);
      setActiveTab('overview');
    },
  });

  // Execute command mutation
  const executeCommandMutation = useMutation({
    mutationFn: (command: string) => 
      serverManagementApi.executeCommand(server.id, command),
    onSuccess: (result) => {
      setTerminalOutput(prev => [...prev, result]);
      setTerminalCommand('');
      // Scroll to bottom of terminal
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    },
  });

  // Analyze logs mutation
  const analyzeLogsMutation = useMutation({
    mutationFn: () => serverManagementApi.analyzeServerLogs(server.id, 500),
    onSuccess: (analysis) => {
      setLogAnalysis(analysis);
    },
  });

  const handleSave = () => {
    updateMutation.mutate(editForm);
  };

  const handleExecuteCommand = () => {
    if (terminalCommand.trim()) {
      executeCommandMutation.mutate(terminalCommand.trim());
    }
  };

  const handleAnalyzeLogs = () => {
    analyzeLogsMutation.mutate();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Online': return 'text-green-400 bg-green-500/10';
      case 'Warning': return 'text-yellow-400 bg-yellow-500/10';
      case 'Critical': return 'text-red-400 bg-red-500/10';
      case 'Offline': return 'text-gray-400 bg-gray-500/10';
      default: return 'text-blue-400 bg-blue-500/10';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': 
      case 'critical': return 'text-red-400 bg-red-500/10';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10';
      case 'low': return 'text-blue-400 bg-blue-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  const latestHealthCheck = server.healthChecks?.[0];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`rounded-2xl border backdrop-blur-sm max-w-6xl w-full max-h-[90vh] overflow-hidden ${
        darkMode 
          ? 'bg-gray-800/90 border-gray-700/50' 
          : 'bg-white/90 border-gray-200/50'
      }`}>
        {/* Header */}
        <div className={`p-6 border-b ${darkMode ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl ${
                darkMode ? 'bg-blue-900/50' : 'bg-blue-100/50'
              }`}>
                <Server className={`w-6 h-6 ${
                  darkMode ? 'text-blue-400' : 'text-blue-600'
                }`} />
              </div>
              <div>
                <h2 className={`text-xl font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {server.name}
                </h2>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {server.hostAddress}:{server.sshPort || 22}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(server.status)}`}>
                {server.status}
              </div>
            </div>
            
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                darkMode
                  ? 'hover:bg-gray-700/50 text-gray-400 hover:text-white'
                  : 'hover:bg-gray-100/50 text-gray-600 hover:text-gray-900'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mt-6">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'edit', label: 'Edit', icon: Settings },
              { id: 'logs', label: 'Logs', icon: FileText },
              { id: 'terminal', label: 'Terminal', icon: Terminal },
              { id: 'analysis', label: 'AI Analysis', icon: Brain }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as TabType)}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === id
                    ? darkMode
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                      : 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                    : darkMode
                      ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Server Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`p-4 rounded-xl ${
                  darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'
                }`}>
                  <h3 className={`font-semibold mb-3 ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Server Information
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Type
                      </span>
                      <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {server.type}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Operating System
                      </span>
                      <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {server.operatingSystem || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Last Check
                      </span>
                      <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {server.lastCheckTime 
                          ? new Date(server.lastCheckTime).toLocaleString()
                          : 'Never'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Username
                      </span>
                      <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {server.username || 'Not set'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* System Metrics */}
                {latestHealthCheck && (
                  <div className={`p-4 rounded-xl ${
                    darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'
                  }`}>
                    <h3 className={`font-semibold mb-3 ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      System Metrics
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <Cpu className={`w-5 h-5 mx-auto mb-1 ${
                          (latestHealthCheck.cpuUsage || 0) > 80 ? 'text-red-400' : 'text-blue-400'
                        }`} />
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          CPU
                        </p>
                        <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {latestHealthCheck.cpuUsage?.toFixed(1) || 'N/A'}%
                        </p>
                      </div>
                      <div className="text-center">
                        <MemoryStick className={`w-5 h-5 mx-auto mb-1 ${
                          (latestHealthCheck.memoryUsage || 0) > 80 ? 'text-red-400' : 'text-green-400'
                        }`} />
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Memory
                        </p>
                        <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {latestHealthCheck.memoryUsage?.toFixed(1) || 'N/A'}%
                        </p>
                      </div>
                      <div className="text-center">
                        <HardDrive className={`w-5 h-5 mx-auto mb-1 ${
                          (latestHealthCheck.diskUsage || 0) > 80 ? 'text-red-400' : 'text-purple-400'
                        }`} />
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Disk
                        </p>
                        <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {latestHealthCheck.diskUsage?.toFixed(1) || 'N/A'}%
                        </p>
                      </div>
                      <div className="text-center">
                        <Activity className="w-5 h-5 mx-auto mb-1 text-orange-400" />
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Processes
                        </p>
                        <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {latestHealthCheck.runningProcesses || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Alerts */}
              {server.alerts && server.alerts.length > 0 && (
                <div className={`p-4 rounded-xl ${
                  darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'
                }`}>
                  <h3 className={`font-semibold mb-3 ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Recent Alerts
                  </h3>
                  <div className="space-y-2">
                    {server.alerts.slice(0, 5).map((alert, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          darkMode ? 'bg-gray-800/50' : 'bg-white/50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            getSeverityColor(alert.severity)
                          }`}>
                            {alert.severity}
                          </div>
                          <span className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {alert.message}
                          </span>
                        </div>
                        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {new Date(alert.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Edit Tab */}
          {activeTab === 'edit' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Server Name
                    </label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                        darkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-blue-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      } focus:outline-none focus:ring-0`}
                      placeholder="Enter server name"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Host Address
                    </label>
                    <input
                      type="text"
                      value={editForm.hostAddress || ''}
                      onChange={(e) => setEditForm({...editForm, hostAddress: e.target.value})}
                      className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                        darkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-blue-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      } focus:outline-none focus:ring-0`}
                      placeholder="192.168.1.100 or server.example.com"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      SSH Port
                    </label>
                    <input
                      type="number"
                      value={editForm.sshPort || 22}
                      onChange={(e) => setEditForm({...editForm, sshPort: parseInt(e.target.value) || 22})}
                      className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                        darkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-blue-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      } focus:outline-none focus:ring-0`}
                      placeholder="22"
                      min={1}
                      max={65535}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Username
                    </label>
                    <input
                      type="text"
                      value={editForm.username || ''}
                      onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                      className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                        darkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-blue-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      } focus:outline-none focus:ring-0`}
                      placeholder="root"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Password (leave empty to keep current)
                    </label>
                    <input
                      type="password"
                      value={editForm.password || ''}
                      onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                      className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                        darkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-blue-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                      } focus:outline-none focus:ring-0`}
                      placeholder="Enter new password"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Server Type
                    </label>
                    <select
                      value={editForm.type || 'Server'}
                      onChange={(e) => setEditForm({...editForm, type: e.target.value as any})}
                      className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                        darkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white focus:border-blue-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-900 focus:border-blue-500'
                      } focus:outline-none focus:ring-0`}
                    >
                      <option value="Server">Server</option>
                      <option value="RaspberryPi">Raspberry Pi</option>
                      <option value="VirtualMachine">Virtual Machine</option>
                      <option value="Container">Container</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={editForm.tags || ''}
                  onChange={(e) => setEditForm({...editForm, tags: e.target.value})}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    darkMode
                      ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-blue-500'
                      : 'bg-white/50 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                  } focus:outline-none focus:ring-0`}
                  placeholder="production, web-server, ubuntu"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    darkMode
                      ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
                    darkMode
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40'
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
                  } disabled:opacity-50`}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  System Logs
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => refetchLogs()}
                    disabled={logsLoading}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      darkMode
                        ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                        : 'bg-gray-100/50 text-gray-700 hover:bg-gray-200/50'
                    } disabled:opacity-50`}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${logsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <button
                    onClick={() => copyToClipboard(logs)}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      darkMode
                        ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                        : 'bg-gray-100/50 text-gray-700 hover:bg-gray-200/50'
                    }`}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </button>
                </div>
              </div>

              <div 
                ref={logsContainerRef}
                className={`h-96 overflow-y-auto p-4 rounded-lg font-mono text-xs ${
                  darkMode 
                    ? 'bg-gray-900/50 text-gray-300 border border-gray-700/50' 
                    : 'bg-gray-50/50 text-gray-700 border border-gray-200/50'
                }`}
              >
                {logsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="ml-2">Loading logs...</span>
                  </div>
                ) : logs ? (
                  <pre className="whitespace-pre-wrap break-words">{logs}</pre>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No logs available
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Terminal Tab */}
          {activeTab === 'terminal' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  SSH Terminal
                </h3>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Wifi className="w-4 h-4" />
                  <span>Connected to {server.hostAddress}</span>
                </div>
              </div>

              <div 
                ref={terminalRef}
                className={`h-96 overflow-y-auto p-4 rounded-lg font-mono text-sm ${
                  darkMode 
                    ? 'bg-gray-900/50 text-green-400 border border-gray-700/50' 
                    : 'bg-gray-50/50 text-gray-800 border border-gray-200/50'
                }`}
              >
                {terminalOutput.length === 0 ? (
                  <div className="text-gray-500">
                    Welcome to SSH terminal for {server.name}
                    <br />
                    Type commands below to execute them on the remote server.
                  </div>
                ) : (
                  terminalOutput.map((result, index) => (
                    <div key={index} className="mb-4">
                      <div className="text-blue-400">
                        $ {/* Command would be stored if we kept command history */}
                      </div>
                      {result.output && (
                        <pre className="whitespace-pre-wrap mt-1">{result.output}</pre>
                      )}
                      {result.error && (
                        <pre className="whitespace-pre-wrap mt-1 text-red-400">{result.error}</pre>
                      )}
                      <div className="text-gray-500 text-xs mt-1">
                        Exit code: {result.exitCode} | {new Date(result.executedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex space-x-2">
                <input
                  type="text"
                  value={terminalCommand}
                  onChange={(e) => setTerminalCommand(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleExecuteCommand()}
                  className={`flex-1 px-4 py-2 rounded-lg border font-mono transition-colors ${
                    darkMode
                      ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-400 focus:border-blue-500'
                      : 'bg-white/50 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                  } focus:outline-none focus:ring-0`}
                  placeholder="Enter command (e.g., ls -la, ps aux, df -h)"
                />
                <button
                  onClick={handleExecuteCommand}
                  disabled={executeCommandMutation.isPending || !terminalCommand.trim()}
                  className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
                    darkMode
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  } disabled:opacity-50`}
                >
                  {executeCommandMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* AI Analysis Tab */}
          {activeTab === 'analysis' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  AI Log Analysis
                </h3>
                <button
                  onClick={handleAnalyzeLogs}
                  disabled={analyzeLogsMutation.isPending}
                  className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
                    darkMode
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40'
                  } disabled:opacity-50`}
                >
                  {analyzeLogsMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Analyze Logs
                    </>
                  )}
                </button>
              </div>

              {logAnalysis ? (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className={`p-4 rounded-xl ${
                    darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'
                  }`}>
                    <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Summary
                    </h4>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {logAnalysis.summary}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-blue-400" />
                        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Confidence: {(logAnalysis.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {new Date(logAnalysis.analyzedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Issues */}
                  {logAnalysis.issues && logAnalysis.issues.length > 0 && (
                    <div className={`p-4 rounded-xl ${
                      darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'
                    }`}>
                      <h4 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Issues Found ({logAnalysis.issues.length})
                      </h4>
                      <div className="space-y-3">
                        {logAnalysis.issues.map((issue, index) => (
                          <div 
                            key={index}
                            className={`p-3 rounded-lg border ${
                              darkMode ? 'bg-gray-800/50 border-gray-600/50' : 'bg-white/50 border-gray-200/50'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <div className={`px-2 py-1 rounded text-xs font-medium ${
                                  getSeverityColor(issue.severity)
                                }`}>
                                  {issue.severity}
                                </div>
                                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {issue.type}
                                </span>
                              </div>
                              {issue.lineNumber > 0 && (
                                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                  Line {issue.lineNumber}
                                </span>
                              )}
                            </div>
                            <p className={`text-sm mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {issue.description}
                            </p>
                            {issue.logLine && (
                              <code className={`block p-2 rounded text-xs font-mono ${
                                darkMode ? 'bg-gray-900/50 text-gray-300' : 'bg-gray-100/50 text-gray-700'
                              }`}>
                                {issue.logLine}
                              </code>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {logAnalysis.recommendations && logAnalysis.recommendations.length > 0 && (
                    <div className={`p-4 rounded-xl ${
                      darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'
                    }`}>
                      <h4 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Recommendations
                      </h4>
                      <ul className="space-y-2">
                        {logAnalysis.recommendations.map((rec, index) => (
                          <li 
                            key={index}
                            className={`flex items-start space-x-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
                          >
                            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`flex flex-col items-center justify-center py-12 rounded-xl ${
                  darkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'
                }`}>
                  <Brain className={`w-12 h-12 mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Click "Analyze Logs" to get AI-powered insights about your server logs
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
