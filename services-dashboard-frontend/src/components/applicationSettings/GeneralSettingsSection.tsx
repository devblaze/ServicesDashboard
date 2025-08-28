import React, { useState, useEffect } from 'react';
import { Settings, Palette, RefreshCw, Network, Check, Loader2 } from 'lucide-react';
import { useGeneralSettings, useUpdateGeneralSettings } from '../../hooks/SettingsHooks.ts';
import type { GeneralSettings } from '../../types/SettingsInterfaces';

interface GeneralSettingsSectionProps {
  darkMode?: boolean;
}

export const GeneralSettingsSection: React.FC<GeneralSettingsSectionProps> = ({ darkMode = true }) => {
  const [formData, setFormData] = useState<GeneralSettings | null>(null);

  const { data: settings, isLoading } = useGeneralSettings();
  const updateMutation = useUpdateGeneralSettings();

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => prev ? {
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? parseInt(value) || 0 : value
    } : null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      updateMutation.mutate(formData);
    }
  };

  if (isLoading || !formData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className={`w-8 h-8 animate-spin ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-xl border ${
      darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center space-x-3 mb-6">
        <div className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <Settings className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
        </div>
        <div>
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            General Settings
          </h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Configure application preferences
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Application Name */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Application Name</span>
            </div>
          </label>
          <input
            type="text"
            name="applicationName"
            value={formData.applicationName}
            onChange={handleInputChange}
            placeholder="Services Dashboard"
            className={`w-full px-3 py-2 border rounded-lg ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            required
          />
        </div>

        {/* Theme */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            <div className="flex items-center space-x-2">
              <Palette className="w-4 h-4" />
              <span>Theme</span>
            </div>
          </label>
          <select
            name="theme"
            value={formData.theme}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="auto">Auto (System)</option>
          </select>
        </div>

        {/* Refresh Settings */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              name="enableAutoRefresh"
              checked={formData.enableAutoRefresh}
              onChange={handleInputChange}
              className="rounded"
            />
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <label className={`text-sm font-medium ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Enable Auto Refresh
              </label>
            </div>
          </div>

          {formData.enableAutoRefresh && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Refresh Interval (minutes)
              </label>
              <input
                type="number"
                name="refreshInterval"
                value={formData.refreshInterval}
                onChange={handleInputChange}
                min="1"
                max="60"
                className={`w-full max-w-xs px-3 py-2 border rounded-lg ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
          )}
        </div>

        {/* Network Discovery */}
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <div className="flex items-center space-x-2">
                <Network className="w-4 h-4" />
                <span>Default Scan Ports</span>
              </div>
            </label>
            <select
              name="defaultScanPorts"
              value={formData.defaultScanPorts}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="common">Common Ports (80, 443, 22, 21, etc.)</option>
              <option value="extended">Extended Range (1-1024)</option>
              <option value="custom">Custom Ports</option>
            </select>
          </div>

          {formData.defaultScanPorts === 'custom' && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Custom Ports (comma-separated)
              </label>
              <input
                type="text"
                name="customPorts"
                value={formData.customPorts || ''}
                onChange={handleInputChange}
                placeholder="80,443,8080,3000,5000"
                className={`w-full px-3 py-2 border rounded-lg ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              darkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } disabled:opacity-50`}
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Save General Settings
          </button>
        </div>
      </form>
    </div>
  );
};
