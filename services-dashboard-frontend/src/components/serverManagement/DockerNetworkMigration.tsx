import React, { useState, useEffect } from 'react';
import {
  Network,
  RefreshCw,
  CheckSquare,
  Square,
  Lightbulb,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { serverManagementApi, type DockerNetworkMigrationAnalysis, type IpSuggestionResult } from '../../services/serverManagementApi';

interface DockerNetworkMigrationProps {
  serverId: number;
  serverName: string;
  darkMode?: boolean;
}

const DockerNetworkMigration: React.FC<DockerNetworkMigrationProps> = ({ serverId, serverName, darkMode = true }) => {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<DockerNetworkMigrationAnalysis | null>(null);
  const [selectedContainers, setSelectedContainers] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<IpSuggestionResult | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [expandedNetworks, setExpandedNetworks] = useState<Set<string>>(new Set(['br0']));

  useEffect(() => {
    loadAnalysis();
  }, [serverId]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      const result = await serverManagementApi.analyzeDockerNetworks(serverId);
      setAnalysis(result);
    } catch (error) {
      console.error('Failed to analyze Docker networks:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleContainerSelection = (containerId: string) => {
    const newSelection = new Set(selectedContainers);
    if (newSelection.has(containerId)) {
      newSelection.delete(containerId);
    } else {
      newSelection.add(containerId);
    }
    setSelectedContainers(newSelection);
  };

  const selectAllBr0Containers = () => {
    if (!analysis) return;
    const br0Containers = analysis.containersByNetwork['br0'] || [];
    const br0Ids = new Set(br0Containers.map(c => c.containerId));
    setSelectedContainers(br0Ids);
  };

  const handleSuggestIps = async () => {
    try {
      setSuggesting(true);
      const result = await serverManagementApi.suggestIpsForMigration({
        serverId,
        containerIds: Array.from(selectedContainers),
        targetNetwork: 'bond0',
        ipRangeStart: '192.168.4.100',
        ipRangeEnd: '192.168.4.249'
      });
      setSuggestions(result);
    } catch (error) {
      console.error('Failed to suggest IPs:', error);
    } finally {
      setSuggesting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(id);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const toggleNetwork = (network: string) => {
    const newExpanded = new Set(expandedNetworks);
    if (newExpanded.has(network)) {
      newExpanded.delete(network);
    } else {
      newExpanded.add(network);
    }
    setExpandedNetworks(newExpanded);
  };

  const getNetworkBadgeColor = (network: string) => {
    switch (network) {
      case 'br0':
        return darkMode
          ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
          : 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'bond0':
        return darkMode
          ? 'bg-green-500/20 text-green-400 border-green-500/50'
          : 'bg-green-100 text-green-800 border-green-300';
      case 'bridge':
        return darkMode
          ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
          : 'bg-blue-100 text-blue-800 border-blue-300';
      case 'host':
        return darkMode
          ? 'bg-purple-500/20 text-purple-400 border-purple-500/50'
          : 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return darkMode
          ? 'bg-gray-500/20 text-gray-400 border-gray-500/50'
          : 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className={`w-8 h-8 mx-auto mb-4 animate-spin ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          Analyzing Docker networks...
        </p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-12 text-center">
        <Network className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          Failed to load network analysis
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-lg p-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Network className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Docker Network Migration Assistant
              </h2>
            </div>
            <p className={`mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {serverName} • {analysis.totalContainers} containers • {analysis.containersNeedingMigration} need migration
            </p>
          </div>
          <button
            onClick={loadAnalysis}
            className={`flex items-center space-x-2 px-4 py-2 rounded ${
              darkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {analysis.containersNeedingMigration > 0 && (
          <div className={`p-4 rounded-lg ${
            darkMode
              ? 'bg-yellow-900/30 border border-yellow-700/50'
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-start space-x-2">
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
              <div className="flex-1">
                <p className={`font-semibold ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                  {analysis.containersNeedingMigration} container{analysis.containersNeedingMigration > 1 ? 's' : ''} on br0 need migration
                </p>
                <p className={`text-sm mt-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
                  Available IP Range: {analysis.suggestedIpRange[0]} - {analysis.suggestedIpRange[1]}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Container Groups by Network */}
      <div className="space-y-4">
        {Object.entries(analysis.containersByNetwork).map(([network, containers]) => (
          <div
            key={network}
            className={`rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
          >
            <button
              onClick={() => toggleNetwork(network)}
              className={`w-full p-4 flex items-center justify-between hover:${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}
            >
              <div className="flex items-center space-x-3">
                {expandedNetworks.has(network) ? (
                  <ChevronDown className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                ) : (
                  <ChevronRight className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                )}
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getNetworkBadgeColor(network)}`}>
                  {network}
                </span>
                <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                  {containers.length} container{containers.length > 1 ? 's' : ''}
                </span>
              </div>
              {network === 'br0' && containers.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAllBr0Containers();
                  }}
                  className={`px-3 py-1 rounded text-sm ${
                    darkMode
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                  }`}
                >
                  Select All for Migration
                </button>
              )}
            </button>

            {expandedNetworks.has(network) && (
              <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="divide-y divide-gray-700">
                  {containers.map((container) => (
                    <div
                      key={container.containerId}
                      className={`p-4 ${darkMode ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}`}
                    >
                      <div className="flex items-start space-x-3">
                        {container.needsMigration && (
                          <button
                            onClick={() => toggleContainerSelection(container.containerId)}
                            className="mt-1"
                          >
                            {selectedContainers.has(container.containerId) ? (
                              <CheckSquare className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                            ) : (
                              <Square className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                            )}
                          </button>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {container.name}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              container.isRunning
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {container.isRunning ? 'Running' : 'Stopped'}
                            </span>
                          </div>
                          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {container.image}
                          </p>
                          {container.currentIp && (
                            <p className={`text-sm font-mono mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Current IP: {container.currentIp}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Migration Actions */}
      {selectedContainers.size > 0 && (
        <div className={`rounded-lg p-6 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Selected Containers
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {selectedContainers.size} container{selectedContainers.size > 1 ? 's' : ''} selected for migration
              </p>
            </div>
            <button
              onClick={handleSuggestIps}
              disabled={suggesting}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg ${
                suggesting
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              } ${
                darkMode
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {suggesting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Finding Available IPs...</span>
                </>
              ) : (
                <>
                  <Lightbulb className="w-5 h-5" />
                  <span>Suggest IPs</span>
                </>
              )}
            </button>
          </div>

          {suggestions && (
            <div className="mt-6 space-y-4">
              <div className={`p-4 rounded-lg ${
                darkMode
                  ? 'bg-green-900/30 border border-green-700/50'
                  : 'bg-green-50 border border-green-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle2 className={`w-5 h-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                  <span className={`font-semibold ${darkMode ? 'text-green-300' : 'text-green-800'}`}>
                    Found {suggestions.availableIpsFound} available IPs (checked {suggestions.totalChecked} addresses)
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {suggestions.suggestions.map((suggestion) => (
                  <div
                    key={suggestion.containerId}
                    className={`p-4 rounded-lg border ${
                      suggestion.hasConflict
                        ? darkMode
                          ? 'bg-red-900/30 border-red-700/50'
                          : 'bg-red-50 border-red-200'
                        : darkMode
                          ? 'bg-gray-700 border-gray-600'
                          : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {suggestion.containerName}
                          </span>
                          {suggestion.hasConflict && (
                            <AlertTriangle className={`w-4 h-4 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                          )}
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Suggested IP:
                            </span>
                            <span className={`font-mono font-semibold ${
                              suggestion.hasConflict
                                ? darkMode ? 'text-red-400' : 'text-red-600'
                                : darkMode ? 'text-green-400' : 'text-green-600'
                            }`}>
                              {suggestion.suggestedIp}
                            </span>
                          </div>
                          {suggestion.conflicts.length > 0 && (
                            <div className={`text-xs mt-2 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                              Conflicts:
                              {suggestion.conflicts.slice(0, 2).map((conflict, idx) => (
                                <div key={idx} className="ml-4">
                                  • {conflict.source}: {conflict.deviceName}
                                  {conflict.serverName && ` on ${conflict.serverName}`}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {!suggestion.hasConflict && (
                        <button
                          onClick={() => copyToClipboard(suggestion.suggestedIp, suggestion.containerId)}
                          className={`ml-4 p-2 rounded ${
                            copiedCommand === suggestion.containerId
                              ? 'bg-green-600 text-white'
                              : darkMode
                                ? 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                          }`}
                          title="Copy IP"
                        >
                          {copiedCommand === suggestion.containerId ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-900/30 border border-blue-700/50' : 'bg-blue-50 border border-blue-200'}`}>
                <p className={`font-semibold mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                  Migration Instructions:
                </p>
                <ol className={`list-decimal list-inside space-y-1 text-sm ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                  <li>In Unraid Docker tab, click on each container to edit</li>
                  <li>Change Network Type from "br0" to "bond0"</li>
                  <li>Set the suggested IP address in the IP field</li>
                  <li>Click "Apply" to save changes</li>
                  <li>Start the container to verify it works with the new IP</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DockerNetworkMigration;
