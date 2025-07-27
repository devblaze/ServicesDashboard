import { useState } from 'react';
import { QueryProvider } from './providers/QueryProvider';
import { ServicesList } from './components/ServicesList';
import { NetworkDiscovery } from './components/NetworkDiscovery';
import ApiConnectionTest from './components/ApiConnectionTest';
import './App.css';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'services' | 'discovery'>('services');

  return (
    <QueryProvider>
      <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <header className="mb-8">
            <div className="flex justify-between items-center">
              <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Services Dashboard
              </h1>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`px-4 py-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-800 text-white border-gray-600 hover:bg-gray-700' 
                    : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                } transition-colors`}
              >
                {darkMode ? '☀️ Light' : '🌙 Dark'}
              </button>
            </div>
            
            {/* Tab Navigation */}
            <div className="mt-6">
              <nav className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('services')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    activeTab === 'services'
                      ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700')
                      : (darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700')
                  }`}
                >
                  Services
                </button>
                <button
                  onClick={() => setActiveTab('discovery')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    activeTab === 'discovery'
                      ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700')
                      : (darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700')
                  }`}
                >
                  Network Discovery
                </button>
              </nav>
            </div>
          </header>

          {/* API Connection Test */}
          <div className="mb-8">
            <ApiConnectionTest />
          </div>

          {/* Main Content */}
          <main>
            {activeTab === 'services' ? (
              <ServicesList darkMode={darkMode} />
            ) : (
              <NetworkDiscovery darkMode={darkMode} />
            )}
          </main>
        </div>
      </div>
    </QueryProvider>
  );
}

export default App;