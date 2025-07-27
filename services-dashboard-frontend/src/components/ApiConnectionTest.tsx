import { useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface ApiConnectionTestProps {
  darkMode?: boolean;
}

const ApiConnectionTest = ({ darkMode = true }: ApiConnectionTestProps) => { // Default to dark mode
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
        return <Clock className="w-4 h-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'testing':
        return darkMode 
          ? 'border-blue-600 bg-blue-900/20 text-blue-300' 
          : 'border-blue-300 bg-blue-50 text-blue-700';
      case 'success':
        return darkMode 
          ? 'border-green-600 bg-green-900/20 text-green-300' 
          : 'border-green-300 bg-green-50 text-green-700';
      case 'error':
        return darkMode 
          ? 'border-red-600 bg-red-900/20 text-red-300' 
          : 'border-red-300 bg-red-50 text-red-700';
      default:
        return darkMode 
          ? 'border-gray-700 bg-gray-800 text-gray-300' 
          : 'border-gray-300 bg-white text-gray-700';
    }
  };

  return (
    <div className={`rounded-lg border p-4 transition-all duration-200 ${getStatusColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-medium">API Connection</h3>
            <p className="text-sm opacity-75">
              {message || 'Click to test API connection'}
            </p>
          </div>
        </div>
        <button
          onClick={testConnection}
          disabled={status === 'testing'}
          className={`px-4 py-2 rounded-md font-medium transition-colors duration-200 disabled:opacity-50 ${
            darkMode
              ? 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
              : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300'
          }`}
        >
          {status === 'testing' ? 'Testing...' : 'Test Connection'}
        </button>
      </div>
    </div>
  );
};

export default ApiConnectionTest;