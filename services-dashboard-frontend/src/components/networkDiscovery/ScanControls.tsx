import React from 'react';
import { 
  Search, 
  Loader2, 
  Wifi, 
  Activity, 
  Zap, 
  Database 
} from 'lucide-react';
import type { ScanMode } from '../../hooks/useNetworkDiscovery';

interface ScanControlsProps {
  darkMode?: boolean;
  scanMode: ScanMode;
  setScanMode: (mode: ScanMode) => void;
  scanType: 'network' | 'host';
  setScanType: (type: 'network' | 'host') => void;
  networkRange: string;
  setNetworkRange: (range: string) => void;
  hostAddress: string;
  setHostAddress: (address: string) => void;
  customPorts: string;
  setCustomPorts: (ports: string) => void;
  fullScan: boolean;
  setFullScan: (fullScan: boolean) => void;
  isScanning: boolean;
  onScan: () => void;
  commonPorts: number[];
}

export const ScanControls: React.FC<ScanControlsProps> = ({
  darkMode = true,
  scanMode,
  setScanMode,
  scanType,
  setScanType,
  networkRange,
  setNetworkRange,
  hostAddress,
  setHostAddress,
  customPorts,
  setCustomPorts,
  fullScan,
  setFullScan,
  isScanning,
  onScan,
  commonPorts
}) => {
  const isQuickMode = scanMode === 'quick';
  const isBackgroundMode = scanMode === 'background';

  return (
    <>
      {/* Scan Mode Selection */}
      <div className={`inline-flex p-1 rounded-xl mb-6 ${
        darkMode ? 'bg-gray-700/50' : 'bg-gray-100/50'
      }`}>
        <button
          onClick={() => setScanMode('quick')}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            isQuickMode
              ? darkMode
                ? 'bg-yellow-600 text-white shadow-lg'
                : 'bg-yellow-500 text-white shadow-lg'
              : darkMode
                ? 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          <Zap className="w-4 h-4 mr-2" />
          Quick Scan
        </button>
        <button
          onClick={() => setScanMode('background')}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            isBackgroundMode
              ? darkMode
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-blue-500 text-white shadow-lg'
              : darkMode
                ? 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          <Database className="w-4 h-4 mr-2" />
          Background Scan
        </button>
      </div>
      
      {/* Scan Type Selection */}
      <div className={`inline-flex p-1 rounded-xl mb-6 ${
        darkMode ? 'bg-gray-700/50' : 'bg-gray-100/50'
      }`}>
        <button
          onClick={() => setScanType('network')}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            scanType === 'network'
              ? darkMode
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-blue-500 text-white shadow-lg'
              : darkMode
                ? 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          <Wifi className="w-4 h-4 mr-2" />
          Network Range
        </button>
        <button
          onClick={() => setScanType('host')}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            scanType === 'host'
              ? darkMode
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-blue-500 text-white shadow-lg'
              : darkMode
                ? 'text-gray-300 hover:text-white hover:bg-gray-600/50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          <Activity className="w-4 h-4 mr-2" />
          Single Host
        </button>
      </div>

      {/* Input Fields and Options */}
      <div className="space-y-4">
        {/* Main Input Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scanType === 'network' ? (
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Network Range (CIDR)
              </label>
              <input
                type="text"
                value={networkRange}
                onChange={(e) => setNetworkRange(e.target.value)}
                placeholder="192.168.4.0/24"
                className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  darkMode
                    ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:bg-gray-700'
                    : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-white'
                }`}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className={`block text-sm font-medium ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Host Address
              </label>
              <input
                type="text"
                value={hostAddress}
                onChange={(e) => setHostAddress(e.target.value)}
                placeholder="192.168.4.1"
                className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  darkMode
                    ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:bg-gray-700'
                    : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-white'
                }`}
              />
            </div>
          )}
          
          <div className="space-y-2">
            <label className={`block text-sm font-medium ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Custom Ports (comma-separated)
            </label>
            <input
              type="text"
              value={customPorts}
              onChange={(e) => setCustomPorts(e.target.value)}
              placeholder={`Default: ${commonPorts.slice(0, 5).join(', ')}...`}
              disabled={isQuickMode}
              className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isQuickMode 
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              } ${
                darkMode
                  ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:bg-gray-700'
                  : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-white'
              }`}
            />
          </div>
        </div>

        {/* Options and Scan Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Full Port Scan Checkbox - Only show for background scans */}
          {isBackgroundMode && (
            <div className="flex items-center">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="fullScan"
                  checked={fullScan}
                  onChange={(e) => setFullScan(e.target.checked)}
                  className={`w-5 h-5 rounded border-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer ${
                    darkMode
                      ? 'bg-gray-700/50 border-gray-600 text-blue-600 focus:ring-offset-gray-800'
                      : 'bg-white border-gray-300 text-blue-600 focus:ring-offset-white'
                  }`}
                />
                <label 
                  htmlFor="fullScan" 
                  className={`ml-3 text-sm font-medium cursor-pointer ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Full port scan (all 65535 ports)
                  <span className={`block text-xs ${
                    darkMode ? 'text-gray-500' : 'text-gray-500'
                  }`}>
                    Warning: This will take significantly longer
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Scan Button */}
          <button
            onClick={onScan}
            disabled={isScanning || (!networkRange && scanType === 'network') || (!hostAddress && scanType === 'host')}
            className={`flex items-center justify-center px-8 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg ${
              isScanning || (!networkRange && scanType === 'network') || (!hostAddress && scanType === 'host')
                ? darkMode
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : darkMode
                  ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95 shadow-blue-900/25'
                  : 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105 active:scale-95 shadow-blue-500/25'
            }`}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="w-5 h-5 mr-2" />
                Start {isQuickMode ? 'Quick' : 'Background'} Scan
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};