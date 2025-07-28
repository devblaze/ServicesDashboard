import { useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

interface ApiConnectionTestProps {
  darkMode?: boolean;
}

const ApiConnectionTest = ({ darkMode = true }: ApiConnectionTestProps) => {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const testConnection = async () => {
    setStatus('testing');
    setMessage('Testing connection...');
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${API_BASE_URL}/health`);
      
      if (response.ok) {
        setStatus('success');
        setMessage('API connection successful');
      } else {
        setStatus('error');
        setMessage(`API returned status: ${response.status}`);
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Connection failed');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'testing':
        return <Clock className="w-5 h-5 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    }
  };

  const getMainIcon = () => {
    switch (status) {
      case 'success':
        return <Wifi className="w-6 h-6 text-emerald-500" />;
      case 'error':
        return <WifiOff className="w-6 h-6 text-red-500" />;
      default:
        return <Wifi className={`w-6 h-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />;
    }
  };

  const getContainerStyle = () => {
    const baseStyle = `rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
      darkMode 
        ? 'bg-gray-800/50 border-gray-700/50' 
        : 'bg-white/80 border-gray-200/50'
    }`;

    switch (status) {
      case 'testing':
        return `${baseStyle} ${
          darkMode 
            ? 'border-blue-500/50 bg-blue-900/20 shadow-lg shadow-blue-900/20' 
            : 'border-blue-300/50 bg-blue-50/50 shadow-lg shadow-blue-200/20'
        }`;
      case 'success':
        return `${baseStyle} ${
          darkMode 
            ? 'border-emerald-500/50 bg-emerald-900/20 shadow-lg shadow-emerald-900/20' 
            : 'border-emerald-300/50 bg-emerald-50/50 shadow-lg shadow-emerald-200/20'
        }`;
      case 'error':
        return `${baseStyle} ${
          darkMode 
            ? 'border-red-500/50 bg-red-900/20 shadow-lg shadow-red-900/20' 
            : 'border-red-300/50 bg-red-50/50 shadow-lg shadow-red-200/20'
        }`;
      default:
        return `${baseStyle} ${
          darkMode 
            ? 'shadow-lg shadow-gray-900/20' 
            : 'shadow-lg shadow-gray-200/20'
        }`;
    }
  };

  return (
    <div className={getContainerStyle()}>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${
              darkMode ? 'bg-gray-700/50' : 'bg-gray-100/50'
            }`}>
              {getMainIcon()}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className={`font-semibold text-lg ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  API Connection
                </h3>
                {getStatusIcon()}
              </div>
              
              <p className={`text-sm ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {message || 'Monitor your backend API connection status'}
              </p>
            </div>
          </div>
          
          <button
            onClick={testConnection}
            disabled={status === 'testing'}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group ${
              darkMode
                ? 'bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white shadow-lg shadow-gray-900/25'
                : 'bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 text-gray-900 shadow-lg shadow-gray-200/50 border border-gray-200'
            } hover:scale-105 active:scale-95`}
          >
            {status === 'testing' ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Testing...
              </span>
            ) : (
              <span className="flex items-center">
                <Wifi className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" />
                Test Connection
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiConnectionTest;