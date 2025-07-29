import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorDisplayProps {
  error: Error | null;
  darkMode?: boolean;
  onRetry?: () => void;
  title?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  darkMode = true,
  onRetry,
  title = 'Error occurred'
}) => {
  if (!error) return null;

  return (
    <div className={`rounded-lg p-6 border transition-colors duration-200 ${
      darkMode 
        ? 'bg-red-900/20 border-red-800 text-red-200' 
        : 'bg-red-50 border-red-200 text-red-800'
    }`}>
      <div className="flex items-start">
        <AlertCircle className={`w-5 h-5 mr-3 mt-0.5 ${
          darkMode ? 'text-red-400' : 'text-red-500'
        }`} />
        <div>
          <h3 className="font-semibold text-lg mb-2">{title}</h3>
          <p className={`mb-4 ${
            darkMode ? 'text-red-300' : 'text-red-700'
          }`}>
            {error.message || 'An unexpected error occurred'}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className={`inline-flex items-center px-4 py-2 rounded-md font-medium transition-colors duration-200 ${
                darkMode
                  ? 'bg-red-800 hover:bg-red-700 text-red-100'
                  : 'bg-red-100 hover:bg-red-200 text-red-800'
              }`}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
