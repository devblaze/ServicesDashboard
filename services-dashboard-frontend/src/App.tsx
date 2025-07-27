import { useState, useEffect } from 'react';
import { QueryProvider } from './providers/QueryProvider';
import { ServicesList } from './components/ServicesList';
import { NetworkDiscovery } from './components/NetworkDiscovery';
import ApiConnectionTest from './components/ApiConnectionTest';
import { Sun, Moon } from 'lucide-react';
import './App.css';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'services' | 'discovery'>('services');

  // Check for user preference on initial load
  useEffect(() => {
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme) {
      setDarkMode(JSON.parse(savedTheme));
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  // Update document class and save preference when darkMode changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <QueryProvider>
      <div className={`min-h-screen transition-colors duration-200 ${
        darkMode ? 'dark bg-gray-900' : 'bg-gray-50'
      }`}>
        {/* Header */}
        <header className={`sticky top-0 z-10 border-b transition-colors duration-200 ${
          darkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <h1 className={`text-3xl font-bold transition-colors duration-200 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Services Dashboard
              </h1>
              <button
                onClick={toggleDarkMode}
                className={`flex items-center px-4 py-2 rounded-lg border transition-all duration-200 ${
                  darkMode 
                    ? 'bg-gray-700 text-white border-gray-600 hover:bg-gray-600' 
                    : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {darkMode ? (
                  <>
                    <Sun className="w-4 h-4 mr-2" />
                    Light
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 mr-2" />
                    Dark
                  </>
                )}
              </button>
            </div>
            
            {/* Tab Navigation */}
            <nav className="flex space-x-1 pb-4">
              <button
                onClick={() => setActiveTab('services')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'services'
                    ? (darkMode 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-blue-100 text-blue-700 shadow-sm')
                    : (darkMode 
                        ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')
                }`}
              >
                Services
              </button>
              <button
                onClick={() => setActiveTab('discovery')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'discovery'
                    ? (darkMode 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-blue-100 text-blue-700 shadow-sm')
                    : (darkMode 
                        ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100')
                }`}
              >
                Network Discovery
              </button>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* API Connection Test */}
          <div className="mb-8">
            <ApiConnectionTest darkMode={darkMode} />
          </div>

          {/* Tab Content */}
          {activeTab === 'services' ? (
            <ServicesList darkMode={darkMode} />
          ) : (
            <NetworkDiscovery darkMode={darkMode} />
          )}
        </main>
      </div>
    </QueryProvider>
  );
}

export default App;