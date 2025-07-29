import React from 'react';
import { Server, Plus } from 'lucide-react';

interface EmptyStateProps {
  darkMode?: boolean;
  onAddService: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  darkMode = true, 
  onAddService 
}) => {
  return (
    <div className={`text-center p-12 rounded-lg border transition-colors duration-200 ${
      darkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      <Server className={`w-16 h-16 mx-auto mb-4 ${
        darkMode ? 'text-gray-500' : 'text-gray-400'
      }`} />
      <h3 className={`text-xl font-semibold mb-2 ${
        darkMode ? 'text-white' : 'text-gray-900'
      }`}>
        No services found
      </h3>
      <p className={`text-lg mb-6 ${
        darkMode ? 'text-gray-400' : 'text-gray-600'
      }`}>
        Add your first service to get started.
      </p>
      <button 
        onClick={onAddService}
        className={`inline-flex items-center px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
          darkMode
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        <Plus className="w-5 h-5 mr-2" />
        Add Your First Service
      </button>
    </div>
  );
};
