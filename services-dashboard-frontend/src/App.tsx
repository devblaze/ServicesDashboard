import { useState } from 'react';
import { QueryProvider } from './providers/QueryProvider';
import { MonitoringProvider } from './providers/MonitoringProvider';
import { ServicesList } from './components/pages/ServicesList.tsx';
import { ServerManagement } from './components/pages/ServerManagement.tsx';
import { NetworkDiscovery } from './components/pages/NetworkDiscovery.tsx';
import ApiConnectionTest from './components/ApiConnectionTest';
import { ApplicationSettings } from './components/pages/ApplicationSettings.tsx';
import { 
  Monitor, 
  Server, 
  Network, 
  Settings, 
  TestTube,
  Moon,
  Sun,
  Activity
} from 'lucide-react';
import './App.css';

type TabType = 'services' | 'servers' | 'network' | 'connection' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('services');
  const [darkMode, setDarkMode] = useState(true);

  const tabs = [
    { id: 'services' as const, name: 'Services', icon: Monitor },
    { id: 'servers' as const, name: 'Servers', icon: Server },
    { id: 'network' as const, name: 'Discovery', icon: Network },
    { id: 'connection' as const, name: 'API Test', icon: TestTube },
    { id: 'settings' as const, name: 'AI Settings', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'services':
        return <ServicesList darkMode={darkMode} />;
      case 'servers':
        return <ServerManagement darkMode={darkMode} />;
      case 'network':
        return <NetworkDiscovery darkMode={darkMode} />;
      case 'connection':
        return <ApiConnectionTest darkMode={darkMode} />;
      case 'settings':
        return <ApplicationSettings darkMode={darkMode} />;
      default:
        return <ServicesList darkMode={darkMode} />;
    }
  };

  return (
    <QueryProvider>
      <MonitoringProvider
        enableServerConnectivity={true}
        enableServerHealth={true}
        enableServiceHealth={true}
        connectivityInterval={1} // 1 minute
        healthInterval={5} // 5 minutes
      >
        <div className={`min-h-screen transition-colors duration-300 ${
          darkMode 
            ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
            : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
        }`}>
          {/* Header */}
          <div className={`border-b backdrop-blur-sm sticky top-0 z-50 ${
            darkMode 
              ? 'bg-gray-800/50 border-gray-700/50' 
              : 'bg-white/50 border-gray-200/50'
          }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-xl ${
                    darkMode ? 'bg-blue-900/50' : 'bg-blue-100/50'
                  }`}>
                    <Activity className={`w-6 h-6 ${
                      darkMode ? 'text-blue-400' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <h1 className={`text-xl font-bold ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Services Dashboard
                    </h1>
                    <p className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Monitor your services and servers with automatic health checks
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Monitoring Status Indicator */}
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
                    darkMode 
                      ? 'bg-green-900/30 text-green-400 border border-green-600/30'
                      : 'bg-green-100 text-green-700 border border-green-200'
                  }`}>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span>Auto-monitoring enabled</span>
                  </div>

                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className={`p-2 rounded-lg transition-colors ${
                      darkMode
                        ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white'
                        : 'bg-gray-100/50 hover:bg-gray-200/50 text-gray-700 hover:text-gray-900'
                    }`}
                    aria-label="Toggle dark mode"
                  >
                    {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex space-x-8 -mb-px">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? darkMode
                            ? 'border-blue-400 text-blue-400'
                            : 'border-blue-500 text-blue-600'
                          : darkMode
                            ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {renderContent()}
          </div>
        </div>
      </MonitoringProvider>
    </QueryProvider>
  );
}

export default App;