import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface ApiConnectionStatusProps {
  darkMode?: boolean;
}

export const ApiConnectionStatus: React.FC<ApiConnectionStatusProps> = ({ darkMode = true }) => {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [lastChecked, setLastChecked] = useState<string>('');

  const testConnection = async () => {
    setStatus('testing');
    setMessage('Testing connection...');
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${API_BASE_URL}/health`);
      
      if (response.ok) {
        setStatus('success');
        setMessage('API connection successful');
        setLastChecked(new Date().toLocaleTimeString());
      } else {
        setStatus('error');
        setMessage(`API returned status: ${response.status}`);
        setLastChecked(new Date().toLocaleTimeString());
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Connection failed');
      setLastChecked(new Date().toLocaleTimeString());
    }
  };

  // Auto-test connection on mount
  useEffect(() => {
    testConnection();
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'testing':
        return <Clock className="w-4 h-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'testing':
        return darkMode 
          ? 'border-blue-500/50 bg-blue-900/20' 
          : 'border-blue-300/50 bg-blue-50';
      case 'success':
        return darkMode 
          ? 'border-emerald-500/50 bg-emerald-900/20' 
          : 'border-emerald-300/50 bg-emerald-50';
      case 'error':
        return darkMode 
          ? 'border-red-500/50 bg-red-900/20' 
          : 'border-red-300/50 bg-red-50';
      default:
        return darkMode 
          ? 'border-gray-700 bg-gray-800/50' 
          : 'border-gray-200 bg-white';
    }
  };

  return (
    <div className={`p-4 rounded-xl border transition-all duration-300 ${getStatusColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${
            darkMode ? 'bg-gray-700/50' : 'bg-gray-100/50'
          }`}>
            {status === 'success' ? (
              <Wifi className="w-5 h-5 text-emerald-500" />
            ) : status === 'error' ? (
              <WifiOff className="w-5 h-5 text-red-500" />
            ) : (
              <Wifi className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            )}
          </div>
          
          <div>
            <div className="flex items-center space-x-2">
              <h3 className={`font-medium ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Backend API
              </h3>
              {getStatusIcon()}
            </div>
            
            <div className="flex items-center space-x-2">
              <p className={`text-sm ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {message || 'Checking connection...'}
              </p>
              {lastChecked && (
                <span className={`text-xs ${
                  darkMode ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  • Last checked: {lastChecked}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <button
          onClick={testConnection}
          disabled={status === 'testing'}
          className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            darkMode
              ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300'
              : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
          }`}
          title="Refresh connection status"
        >
          <RefreshCw className={`w-4 h-4 ${
            status === 'testing' ? 'animate-spin' : ''
          }`} />
        </button>
      </div>
    </div>
  );
};