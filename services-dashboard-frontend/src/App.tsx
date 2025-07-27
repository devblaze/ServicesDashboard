import { useState } from 'react';
import { QueryProvider } from './providers/QueryProvider';
import { ServicesList } from './components/ServicesList';
import ApiConnectionTest from './components/ApiConnectionTest';
import './App.css';

function App() {
  const [darkMode, setDarkMode] = useState(false);

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
          </header>

          {/* API Connection Test */}
          <div className="mb-8">
            <ApiConnectionTest />
          </div>

          {/* Main Content */}
          <main>
            <ServicesList darkMode={darkMode} />
          </main>
        </div>
      </div>
    </QueryProvider>
  );
}

export default App;