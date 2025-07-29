import React from 'react';
import { RefreshCw } from 'lucide-react';

interface LoadingSpinnerProps {
  darkMode?: boolean;
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  darkMode = true, 
  message = 'Loading...' 
}) => {
  return (
    <div className="flex justify-center items-center p-12">
      <div className="text-center">
        <RefreshCw className={`w-8 h-8 animate-spin mx-auto mb-4 ${
          darkMode ? 'text-blue-400' : 'text-blue-600'
        }`} />
        <span className={`text-lg ${
          darkMode ? 'text-gray-300' : 'text-gray-600'
        }`}>
          {message}
        </span>
      </div>
    </div>
  );
};
