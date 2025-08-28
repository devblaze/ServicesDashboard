import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ChevronDown, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock,
  X 
} from 'lucide-react';

// Define the ServerSummary type since it's not available from the import
interface ServerSummary {
  id: number;
  name: string;
  hostAddress: string;
  status: string;
  type: string;
}

interface ServerDropdownProps {
  selectedServerId?: number;
  onServerSelect: (serverId: number | undefined) => void;
  darkMode?: boolean;
  placeholder?: string;
  required?: boolean;
}

export const ServerDropdown: React.FC<ServerDropdownProps> = ({
  selectedServerId,
  onServerSelect,
  darkMode = true,
  placeholder = "Select a server",
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Mock data since the API endpoint doesn't exist yet
  const { data: servers = [], isLoading } = useQuery({
    queryKey: ['servers-for-services'],
    queryFn: async (): Promise<ServerSummary[]> => {
      // For now, return mock data until the backend API is available
      return [
        { id: 1, name: 'Server 1', hostAddress: '192.168.1.100', status: 'Online', type: 'VirtualMachine' },
        { id: 2, name: 'Server 2', hostAddress: '192.168.1.101', status: 'Warning', type: 'RaspberryPi' },
        { id: 3, name: 'Server 3', hostAddress: '192.168.1.102', status: 'Offline', type: 'Container' },
      ];
    },
    refetchInterval: 30000, // Refresh every 30 seconds to get updated status
  });

  const selectedServer = servers.find((s: ServerSummary) => s.id === selectedServerId);

  const filteredServers = servers.filter((server: ServerSummary) =>
    server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    server.hostAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'critical':
      case 'offline':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'critical':
      case 'offline':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getServerTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'raspberrypi':
        return '🥧';
      case 'virtualmachine':
        return '💻';
      case 'container':
        return '📦';
      default:
        return '🖥️';
    }
  };

  const handleServerSelect = (server: ServerSummary) => {
    onServerSelect(server.id);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onServerSelect(undefined);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className={`block text-sm font-medium mb-2 ${
        darkMode ? 'text-gray-300' : 'text-gray-700'
      }`}>
        Server {required && '*'}
      </label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 border rounded-lg transition-colors text-left flex items-center justify-between ${
          darkMode
            ? 'bg-gray-700 border-gray-600 text-white hover:border-gray-500'
            : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'
        } ${isOpen ? 'ring-2 ring-blue-500/20 border-blue-500/50' : ''}`}
      >
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {selectedServer ? (
            <>
              <span className="text-sm">{getServerTypeIcon(selectedServer.type)}</span>
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <span className="font-medium truncate">{selectedServer.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  darkMode ? 'bg-gray-600/50' : 'bg-gray-200/50'
                }`}>
                  {selectedServer.hostAddress}
                </span>
                <div className={`flex items-center space-x-1 ${getStatusColor(selectedServer.status)}`}>
                  {getStatusIcon(selectedServer.status)}
                  <span className="text-xs font-medium">{selectedServer.status}</span>
                </div>
              </div>
            </>
          ) : (
            <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {placeholder}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          {selectedServer && (
            <button
              type="button"
              onClick={handleClear}
              className={`p-0.5 rounded hover:bg-gray-500/20 transition-colors ${
                darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${
            isOpen ? 'rotate-180' : ''
          } ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
        </div>
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 right-0 mt-1 border rounded-lg shadow-lg z-50 ${
          darkMode 
            ? 'bg-gray-800 border-gray-600' 
            : 'bg-white border-gray-300'
        }`}>
          {/* Search Input */}
          <div className="p-3 border-b border-gray-600/50">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search servers..."
                className={`w-full pl-10 pr-3 py-2 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50`}
              />
            </div>
          </div>

          {/* Server Options */}
          <div className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center">
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Loading servers...
                </div>
              </div>
            ) : filteredServers.length === 0 ? (
              <div className="p-4 text-center">
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {searchQuery ? 'No servers found' : 'No servers available'}
                </div>
              </div>
            ) : (
              <>
                {/* Clear Selection Option */}
                <button
                  type="button"
                  onClick={() => {
                    onServerSelect(undefined);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-600/50 transition-colors border-b ${
                    darkMode ? 'border-gray-600/50 text-gray-400' : 'border-gray-200 text-gray-500'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <X className="w-4 h-4" />
                    <span className="text-sm">No server (External service)</span>
                  </div>
                </button>

                {/* Server Options */}
                {filteredServers.map((server: ServerSummary) => (
                  <button
                    key={server.id}
                    type="button"
                    onClick={() => handleServerSelect(server)}
                    className={`w-full px-4 py-3 text-left transition-colors ${
                      darkMode 
                        ? 'hover:bg-gray-700/50 text-white' 
                        : 'hover:bg-gray-50 text-gray-900'
                    } ${selectedServerId === server.id ? 
                      darkMode ? 'bg-blue-600/20' : 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getServerTypeIcon(server.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium truncate">{server.name}</span>
                          <div className={`flex items-center space-x-1 ${getStatusColor(server.status)}`}>
                            {getStatusIcon(server.status)}
                            <span className="text-xs font-medium">{server.status}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            darkMode ? 'bg-gray-600/50 text-gray-300' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {server.hostAddress}
                          </span>
                          <span className={`text-xs ${
                            darkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {server.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};