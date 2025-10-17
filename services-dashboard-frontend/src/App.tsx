import { useState, lazy, Suspense, useRef, useEffect } from 'react';
import { QueryProvider } from './providers/QueryProvider';
import { MonitoringProvider } from './providers/MonitoringProvider';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { ScanNotifications } from './components/ScanNotifications';
import { MonitoringStatusIndicator } from './components/ui/MonitoringStatusIndicator';
import { UpdateNotification } from './components/UpdateNotification';
import { VersionFooter } from './components/ui/VersionFooter';

// Lazy load page components for better code splitting
const ServicesList = lazy(() => import('./components/pages/ServicesList.tsx').then(module => ({ default: module.ServicesList })));
const ServerManagement = lazy(() => import('./components/pages/ServerManagement.tsx').then(module => ({ default: module.ServerManagement })));
const DockerServices = lazy(() => import('./components/pages/DockerServicesManager.tsx').then(module => ({ default: module.DockerServices })));
const NetworkDiscovery = lazy(() => import('./components/pages/NetworkDiscovery.tsx').then(module => ({ default: module.NetworkDiscovery })));
const ScheduledTasksPage = lazy(() => import('./components/pages/ScheduledTasksPage.tsx').then(module => ({ default: module.ScheduledTasksPage })));
const DeploymentsManagement = lazy(() => import('./components/pages/DeploymentsManagement.tsx').then(module => ({ default: module.DeploymentsManagement })));
const ApplicationSettings = lazy(() => import('./components/pages/ApplicationSettings.tsx').then(module => ({ default: module.ApplicationSettings })));
const IpManagementPage = lazy(() => import('./pages/IpManagementPage'));
import {
  Monitor,
  Server,
  Container,
  Network,
  Settings,
  Moon,
  Sun,
  Activity,
  Clock,
  Rocket,
  Globe,
  ChevronDown,
  Layers,
  Zap
} from 'lucide-react';
import './App.css';

type TabType = 'services' | 'servers' | 'docker' | 'network' | 'ip-management' | 'tasks' | 'deployments' | 'connection' | 'settings';

interface MenuItem {
  id: TabType;
  name: string;
  icon: typeof Monitor;
}

interface MenuGroup {
  id: string;
  name: string;
  icon: typeof Monitor;
  items: MenuItem[];
}

type NavItem = MenuItem | MenuGroup;

function isMenuGroup(item: NavItem): item is MenuGroup {
  return 'items' in item;
}

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('services');
  const [darkMode, setDarkMode] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mainNavigation: NavItem[] = [
    { id: 'services' as const, name: 'Services', icon: Monitor },
    {
      id: 'infrastructure',
      name: 'Infrastructure',
      icon: Layers,
      items: [
        { id: 'servers' as const, name: 'Servers', icon: Server },
        { id: 'docker' as const, name: 'Docker Services', icon: Container },
        { id: 'network' as const, name: 'Network Discovery', icon: Network },
        { id: 'ip-management' as const, name: 'IP Management', icon: Globe },
      ],
    },
    {
      id: 'automation',
      name: 'Automation',
      icon: Zap,
      items: [
        { id: 'tasks' as const, name: 'Scheduled Tasks', icon: Clock },
        { id: 'deployments' as const, name: 'Deployments', icon: Rocket },
      ],
    },
  ];

  const rightNavigation: MenuItem[] = [
    { id: 'settings' as const, name: 'Settings', icon: Settings },
  ];

  const handleNavItemClick = (id: TabType) => {
    setActiveTab(id);
    setOpenDropdown(null);
  };

  const toggleDropdown = (groupId: string) => {
    setOpenDropdown(openDropdown === groupId ? null : groupId);
  };

  const renderContent = () => {
    const loadingFallback = (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );

    return (
      <Suspense fallback={loadingFallback}>
        {(() => {
          switch (activeTab) {
            case 'services':
              return <ServicesList darkMode={darkMode} />;
            case 'servers':
              return <ServerManagement darkMode={darkMode} />;
            case 'docker':
              return <DockerServices darkMode={darkMode} />;
            case 'network':
              return <NetworkDiscovery darkMode={darkMode} />;
            case 'ip-management':
              return <IpManagementPage darkMode={darkMode} />;
            case 'tasks':
              return <ScheduledTasksPage darkMode={darkMode} />;
            case 'deployments':
              return <DeploymentsManagement darkMode={darkMode} />;
            case 'settings':
              return <ApplicationSettings darkMode={darkMode} />;
            default:
              return <ServicesList darkMode={darkMode} />;
          }
        })()}
      </Suspense>
    );
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
                  <MonitoringStatusIndicator darkMode={darkMode} />

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
              <div className="flex justify-between items-end -mb-px" ref={dropdownRef}>
                {/* Left Navigation */}
                <div className="flex space-x-1">
                  {mainNavigation.map((item) => {
                    if (isMenuGroup(item)) {
                      // Dropdown menu
                      const Icon = item.icon;
                      const isOpen = openDropdown === item.id;
                      const isActive = item.items.some(subItem => subItem.id === activeTab);

                      return (
                        <div key={item.id} className="relative">
                          <button
                            onClick={() => toggleDropdown(item.id)}
                            className={`flex items-center space-x-2 py-4 px-3 border-b-2 font-medium text-sm transition-colors ${
                              isActive
                                ? darkMode
                                  ? 'border-blue-400 text-blue-400'
                                  : 'border-blue-500 text-blue-600'
                                : darkMode
                                  ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.name}</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {isOpen && (
                            <div className={`absolute top-full left-0 mt-1 min-w-[200px] rounded-lg shadow-lg border z-50 ${
                              darkMode
                                ? 'bg-gray-800 border-gray-700'
                                : 'bg-white border-gray-200'
                            }`}>
                              {item.items.map((subItem) => {
                                const SubIcon = subItem.icon;
                                return (
                                  <button
                                    key={subItem.id}
                                    onClick={() => handleNavItemClick(subItem.id)}
                                    className={`w-full flex items-center space-x-3 px-4 py-3 text-sm transition-colors ${
                                      activeTab === subItem.id
                                        ? darkMode
                                          ? 'bg-blue-900/30 text-blue-400'
                                          : 'bg-blue-50 text-blue-600'
                                        : darkMode
                                          ? 'text-gray-300 hover:bg-gray-700/50'
                                          : 'text-gray-700 hover:bg-gray-50'
                                    } ${
                                      subItem === item.items[0] ? 'rounded-t-lg' : ''
                                    } ${
                                      subItem === item.items[item.items.length - 1] ? 'rounded-b-lg' : ''
                                    }`}
                                  >
                                    <SubIcon className="w-4 h-4" />
                                    <span>{subItem.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      // Direct menu item
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavItemClick(item.id)}
                          className={`flex items-center space-x-2 py-4 px-3 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === item.id
                              ? darkMode
                                ? 'border-blue-400 text-blue-400'
                                : 'border-blue-500 text-blue-600'
                              : darkMode
                                ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.name}</span>
                        </button>
                      );
                    }
                  })}
                </div>

                {/* Right Navigation */}
                <div className="flex space-x-1">
                  {rightNavigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavItemClick(item.id)}
                        className={`flex items-center space-x-2 py-4 px-3 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === item.id
                            ? darkMode
                              ? 'border-blue-400 text-blue-400'
                              : 'border-blue-500 text-blue-600'
                            : darkMode
                              ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {renderContent()}
          </div>
        </div>

        {/* Scan Notifications Component */}
        <ScanNotifications onNavigateToDiscovery={() => setActiveTab('network')} />

        {/* Update Notification Component */}
        <UpdateNotification />

        {/* Version Footer */}
        <VersionFooter darkMode={darkMode} />
      </MonitoringProvider>
    </QueryProvider>
  );
}

export default App;