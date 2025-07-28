import React, { useState } from 'react';
import { QueryProvider } from './providers/QueryProvider';
import { ServicesList } from './components/ServicesList';
import { NetworkDiscovery } from './components/NetworkDiscovery';
import { OllamaSettings } from './components/OllamaSettings';
import ApiConnectionTest from './components/ApiConnectionTest'; // Changed to default import
import { Moon, Sun, Network, Server, Settings } from 'lucide-react';
import './App.css';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'services' | 'discovery' | 'settings'>('services');
  
  return (
    <QueryProvider>
      <div className={`min-h-screen transition-colors ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Services Dashboard
            </h1>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800 text-yellow-400' : 'bg-white text-gray-600'} shadow-md hover:shadow-lg transition-shadow`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setActiveTab('services')}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'services'
                  ? 'bg-blue-600 text-white'
                  : darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Server className="w-4 h-4 mr-2" />
              Services
            </button>
            <button
              onClick={() => setActiveTab('discovery')}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'discovery'
                  ? 'bg-blue-600 text-white'
                  : darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Network className="w-4 h-4 mr-2" />
              Network Discovery
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white'
                  : darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Settings className="w-4 h-4 mr-2" />
              AI Settings
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            <ApiConnectionTest darkMode={darkMode} />

            {activeTab === 'services' && <ServicesList darkMode={darkMode} />}
            {activeTab === 'discovery' && <NetworkDiscovery darkMode={darkMode} />}
            {activeTab === 'settings' && <OllamaSettings darkMode={darkMode} />}
          </div>
        </div>
      </div>
    </QueryProvider>
  );
}

export default App;