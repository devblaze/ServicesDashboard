import React, { useState } from 'react';
import { Settings, Bot, Bell, Palette } from 'lucide-react';
import { AISettingsSection } from '../applicationSettings/AISettingsManagementSection';
import { NotificationSettingsSection } from '../applicationSettings/NotificationSettingsSection';
import { GeneralSettingsSection } from '../applicationSettings/GeneralSettingsSection';
import { ApiConnectionStatus } from '../applicationSettings/ApiConnectionStatus.tsx';

interface SettingsPageProps {
  darkMode?: boolean;
}

type SettingSection = 'ai' | 'notifications' | 'general';

export const ApplicationSettings: React.FC<SettingsPageProps> = ({ darkMode = true }) => {
  const [activeSection, setActiveSection] = useState<SettingSection>('ai');

  const sections = [
    {
      key: 'ai' as const,
      label: 'AI Settings',
      icon: Bot,
      description: 'Configure AI providers and models',
      component: AISettingsSection
    },
    {
      key: 'notifications' as const,
      label: 'Notifications',
      icon: Bell,
      description: 'Set up alerts and notifications',
      component: NotificationSettingsSection
    },
    {
      key: 'general' as const,
      label: 'General',
      icon: Palette,
      description: 'Application preferences',
      component: GeneralSettingsSection
    }
  ];

  const ActiveComponent = sections.find(s => s.key === activeSection)?.component || AISettingsSection;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center space-x-3">
        <div className={`p-3 rounded-xl ${darkMode ? 'bg-blue-900/50' : 'bg-blue-100'}`}>
          <Settings className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
        </div>
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Application Settings
          </h1>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Configure your services dashboard preferences
          </p>
        </div>
      </div>

      {/* API Connection Status */}
      <ApiConnectionStatus darkMode={darkMode} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <nav className={`p-4 rounded-xl border ${
            darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="space-y-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.key}
                    onClick={() => setActiveSection(section.key)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${
                      activeSection === section.key
                        ? darkMode
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-600 text-white'
                        : darkMode
                          ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{section.label}</div>
                      <div className="text-xs opacity-75 truncate">{section.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <ActiveComponent darkMode={darkMode} />
        </div>
      </div>
    </div>
  );
};

export default ApplicationSettings;