import React, { useState, useEffect } from 'react';
import { Activity, Clock, Heart, Shield, AlertTriangle, Check, Loader2, Bell, CheckCircle2, XCircle } from 'lucide-react';
import { useServerMonitoringSettings, useUpdateServerMonitoringSettings } from '../../hooks/SettingsHooks.ts';
import type { ServerMonitoringSettings } from '../../types/SettingsInterfaces';

interface ServerMonitoringSettingsSectionProps {
  darkMode?: boolean;
}

const INTERVAL_OPTIONS = [
  { value: 1, label: '1 Minute' },
  { value: 5, label: '5 Minutes' },
  { value: 10, label: '10 Minutes' },
  { value: 15, label: '15 Minutes' },
  { value: 30, label: '30 Minutes' },
  { value: 60, label: '1 Hour' },
];

export const ServerMonitoringSettingsSection: React.FC<ServerMonitoringSettingsSectionProps> = ({ darkMode = true }) => {
  const [formData, setFormData] = useState<ServerMonitoringSettings | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const { data: settings, isLoading } = useServerMonitoringSettings();
  const updateMutation = useUpdateServerMonitoringSettings();

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  useEffect(() => {
    if (updateMutation.isSuccess) {
      setShowSuccessMessage(true);
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [updateMutation.isSuccess]);

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
          <Activity className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
        </div>
        <div>
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Server Monitoring
          </h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Automated health checks and update monitoring for servers
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Enable Auto Monitoring */}
        <div className={`p-4 rounded-lg border ${
          formData.enableAutoMonitoring
            ? darkMode ? 'bg-blue-900/20 border-blue-600/50' : 'bg-blue-50 border-blue-200'
            : darkMode ? 'bg-gray-700/30 border-gray-600/50' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              name="enableAutoMonitoring"
              checked={formData.enableAutoMonitoring}
              onChange={handleInputChange}
              className="mt-1 rounded"
            />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <Clock className="w-4 h-4" />
                <label className={`text-sm font-medium ${
                  darkMode ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  Enable Automatic Monitoring
                </label>
              </div>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Automatically run health and update checks on all servers at scheduled intervals
              </p>
            </div>
          </div>
        </div>

        {/* Monitoring Interval */}
        {formData.enableAutoMonitoring && (
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>Monitoring Interval</span>
                </div>
              </label>
              <select
                name="monitoringIntervalMinutes"
                value={formData.monitoringIntervalMinutes}
                onChange={handleInputChange}
                className={`w-full max-w-xs px-3 py-2 border rounded-lg ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {INTERVAL_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                How often to check servers automatically
              </p>
            </div>

            {/* Monitoring Options */}
            <div className={`p-4 rounded-lg border space-y-3 ${
              darkMode ? 'bg-gray-700/20 border-gray-600/30' : 'bg-gray-50/50 border-gray-200/50'
            }`}>
              <h4 className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                Monitoring Options
              </h4>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="enableHealthChecks"
                  checked={formData.enableHealthChecks}
                  onChange={handleInputChange}
                  className="rounded"
                />
                <div className="flex items-center space-x-2">
                  <Heart className="w-4 h-4 text-green-400" />
                  <label className={`text-sm ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Include Health Checks (CPU, RAM, Disk)
                  </label>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="enableUpdateChecks"
                  checked={formData.enableUpdateChecks}
                  onChange={handleInputChange}
                  className="rounded"
                />
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-yellow-400" />
                  <label className={`text-sm ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Check for System Updates
                  </label>
                </div>
              </div>
            </div>

            {/* Notification Options */}
            <div className={`p-4 rounded-lg border space-y-3 ${
              darkMode ? 'bg-gray-700/20 border-gray-600/30' : 'bg-gray-50/50 border-gray-200/50'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <Bell className="w-4 h-4" />
                <h4 className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  Notification Triggers
                </h4>
              </div>
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Send notifications when these events occur
              </p>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="notifyOnHealthCheckFailure"
                  checked={formData.notifyOnHealthCheckFailure}
                  onChange={handleInputChange}
                  className="rounded"
                />
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <label className={`text-sm ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Health check fails
                  </label>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="notifyOnCriticalStatus"
                  checked={formData.notifyOnCriticalStatus}
                  onChange={handleInputChange}
                  className="rounded"
                />
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <label className={`text-sm ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Server status becomes critical
                  </label>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="notifyOnSecurityUpdates"
                  checked={formData.notifyOnSecurityUpdates}
                  onChange={handleInputChange}
                  className="rounded"
                />
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-orange-400" />
                  <label className={`text-sm ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Security updates available
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="pt-4 space-y-3">
          {/* Success Message */}
          {showSuccessMessage && (
            <div className={`flex items-center space-x-2 p-3 rounded-lg border ${
              darkMode
                ? 'bg-green-900/20 border-green-600/50 text-green-400'
                : 'bg-green-50 border-green-200 text-green-700'
            }`}>
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">Settings saved successfully!</span>
            </div>
          )}

          {/* Error Message */}
          {updateMutation.isError && (
            <div className={`flex items-center space-x-2 p-3 rounded-lg border ${
              darkMode
                ? 'bg-red-900/20 border-red-600/50 text-red-400'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <XCircle className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-sm font-medium">Failed to save settings</span>
                {updateMutation.error && (
                  <p className="text-xs mt-1 opacity-75">
                    {updateMutation.error instanceof Error ? updateMutation.error.message : 'Unknown error'}
                  </p>
                )}
              </div>
            </div>
          )}

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
            Save Monitoring Settings
          </button>
        </div>
      </form>
    </div>
  );
};
