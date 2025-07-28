import { QueryProvider } from './providers/QueryProvider';
import { ServicesList } from './components/ServicesList';
import { NetworkDiscovery } from './components/NetworkDiscovery';
import { OllamaSettings } from './components/OllamaSettings';
import ApiConnectionTest from './components/ApiConnectionTest';
import { Moon, Sun, Network, Server, Settings, Activity } from 'lucide-react';
import './App.css';
import {useState} from "react";

function App() {
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode
  const [activeTab, setActiveTab] = useState<'services' | 'discovery' | 'settings'>('services');

  return (
    <QueryProvider>
      <div className={`min-h-screen transition-all duration-300 ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
          : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
      }`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${darkMode ? 'white' : 'black'} 1px, transparent 0)`,
            backgroundSize: '20px 20px'
          }}></div>
        </div>

        <div className="relative z-10 min-h-screen">
          {/* Header */}
          <header className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-all duration-300 ${
            darkMode 
              ? 'bg-gray-900/80 border-gray-700/50' 
              : 'bg-white/80 border-gray-200/50'
          }`}>
            <div className="container mx-auto px-6 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className={`p-2.5 rounded-xl ${
                    darkMode 
                      ? 'bg-gradient-to-br from-blue-600 to-purple-600' 
                      : 'bg-gradient-to-br from-blue-500 to-purple-500'
                  }`}>
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className={`text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${
                      darkMode
                        ? 'from-white to-gray-300'
                        : 'from-gray-900 to-gray-600'
                    }`}>
                      Services Dashboard
                    </h1>
                    <p className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Manage and monitor your services
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`p-3 rounded-xl transition-all duration-300 group ${
                    darkMode 
                      ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400 shadow-lg shadow-gray-900/25' 
                      : 'bg-white hover:bg-gray-50 text-gray-600 shadow-lg shadow-gray-200/50'
                  } hover:scale-105 active:scale-95`}
                >
                  {darkMode ? (
                    <Sun className="w-5 h-5 transition-transform group-hover:rotate-12" />
                  ) : (
                    <Moon className="w-5 h-5 transition-transform group-hover:-rotate-12" />
                  )}
                </button>
              </div>
            </div>
          </header>

          <main className="container mx-auto px-6 py-8">
            {/* Navigation Tabs */}
            <nav className="mb-8">
              <div className={`inline-flex p-1.5 rounded-2xl ${
                darkMode 
                  ? 'bg-gray-800/50 backdrop-blur-sm border border-gray-700/50' 
                  : 'bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-lg shadow-gray-200/20'
              }`}>
                <button
                  onClick={() => setActiveTab('services')}
                  className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-300 group ${
                    activeTab === 'services'
                      ? darkMode
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/25'
                        : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25'
                      : darkMode
                      ? 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                  }`}
                >
                  <Server className={`w-4 h-4 mr-2 transition-transform ${
                    activeTab === 'services' ? 'scale-110' : 'group-hover:scale-105'
                  }`} />
                  Services
                </button>
                
                <button
                  onClick={() => setActiveTab('discovery')}
                  className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-300 group ${
                    activeTab === 'discovery'
                      ? darkMode
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/25'
                        : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25'
                      : darkMode
                      ? 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                  }`}
                >
                  <Network className={`w-4 h-4 mr-2 transition-transform ${
                    activeTab === 'discovery' ? 'scale-110' : 'group-hover:scale-105'
                  }`} />
                  Discovery
                </button>
                
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-300 group ${
                    activeTab === 'settings'
                      ? darkMode
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/25'
                        : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25'
                      : darkMode
                      ? 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                  }`}
                >
                  <Settings className={`w-4 h-4 mr-2 transition-transform ${
                    activeTab === 'settings' ? 'scale-110' : 'group-hover:scale-105'
                  }`} />
                  AI Settings
                </button>
              </div>
            </nav>

            {/* Content */}
            <div className="space-y-8 fade-in">
              {/* API Connection Status */}
              <div className="relative">
                <ApiConnectionTest darkMode={darkMode} />
              </div>
              
              {/* Tab Content */}
              <div className="relative">
                {activeTab === 'services' && (
                  <div className="fade-in">
                    <ServicesList darkMode={darkMode} />
                  </div>
                )}
                
                {activeTab === 'discovery' && (
                  <div className="fade-in">
                    <NetworkDiscovery darkMode={darkMode} />
                  </div>
                )}
                
                {activeTab === 'settings' && (
                  <div className="fade-in">
                    <OllamaSettings darkMode={darkMode} />
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </QueryProvider>
  );
}

export default App;