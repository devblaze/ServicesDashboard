import React, { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Smartphone, Check, Loader2 } from 'lucide-react';
import { useNotificationSettings, useUpdateNotificationSettings } from '../../hooks/SettingsHooks.ts';
import type { NotificationSettings } from '../../types/SettingsInterfaces';

interface NotificationSettingsSectionProps {
  darkMode?: boolean;
}

export const NotificationSettingsSection: React.FC<NotificationSettingsSectionProps> = ({ darkMode = true }) => {
  const [formData, setFormData] = useState<NotificationSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'pushover' | 'pushbullet' | 'email'>('pushover');

  const { data: settings, isLoading } = useNotificationSettings();
  const updateMutation = useUpdateNotificationSettings();

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-900/50' : 'bg-blue-100'}`}>
          <Bell className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
        </div>
        <div>
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Notification Settings
          </h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Configure notification channels for alerts
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Notification Type Tabs */}
        <div className="flex space-x-1 p-1 bg-gray-100 rounded-lg dark:bg-gray-700">
          {[
            { key: 'pushover', label: 'Pushover', icon: Smartphone },
            { key: 'pushbullet', label: 'Pushbullet', icon: MessageSquare },
            { key: 'email', label: 'Email', icon: Mail }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={() => setActiveTab(key as any)}
              className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                activeTab === key
                  ? darkMode
                    ? 'bg-gray-800 text-white'
                    : 'bg-white text-gray-900 shadow-sm'
                  : darkMode
                    ? 'text-gray-400 hover:text-gray-300'
                    : 'text-gray-600 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>

        {/* Pushover Settings */}
        {activeTab === 'pushover' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="enablePushover"
                checked={formData.enablePushover}
                onChange={handleInputChange}
                className="rounded"
              />
              <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Enable Pushover Notifications
              </label>
            </div>

            {formData.enablePushover && (
              <>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    User Key
                  </label>
                  <input
                    type="text"
                    name="pushoverUserKey"
                    value={formData.pushoverUserKey || ''}
                    onChange={handleInputChange}
                    placeholder="Your Pushover user key"
                    className={`w-full px-3 py-2 border rounded-lg ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    API Token
                  </label>
                  <input
                    type="password"
                    name="pushoverApiToken"
                    value={formData.pushoverApiToken || ''}
                    onChange={handleInputChange}
                    placeholder="Your application API token"
                    className={`w-full px-3 py-2 border rounded-lg ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Pushbullet Settings */}
        {activeTab === 'pushbullet' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="enablePushbullet"
                checked={formData.enablePushbullet}
                onChange={handleInputChange}
                className="rounded"
              />
              <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Enable Pushbullet Notifications
              </label>
            </div>

            {formData.enablePushbullet && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  API Key
                </label>
                <input
                  type="password"
                  name="pushbulletApiKey"
                  value={formData.pushbulletApiKey || ''}
                  onChange={handleInputChange}
                  placeholder="Your Pushbullet API key"
                  className={`w-full px-3 py-2 border rounded-lg ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            )}
          </div>
        )}

        {/* Email Settings */}
        {activeTab === 'email' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="enableEmail"
                checked={formData.enableEmail}
                onChange={handleInputChange}
                className="rounded"
              />
              <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Enable Email Notifications
              </label>
            </div>

            {formData.enableEmail && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      SMTP Server
                    </label>
                    <input
                      type="text"
                      name="smtpServer"
                      value={formData.smtpServer || ''}
                      onChange={handleInputChange}
                      placeholder="smtp.gmail.com"
                      className={`w-full px-3 py-2 border rounded-lg ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      name="smtpPort"
                      value={formData.smtpPort}
                      onChange={handleInputChange}
                      placeholder="587"
                      className={`w-full px-3 py-2 border rounded-lg ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Username
                    </label>
                    <input
                      type="text"
                      name="smtpUsername"
                      value={formData.smtpUsername || ''}
                      onChange={handleInputChange}
                      placeholder="your.email@gmail.com"
                      className={`w-full px-3 py-2 border rounded-lg ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Password
                    </label>
                    <input
                      type="password"
                      name="smtpPassword"
                      value={formData.smtpPassword || ''}
                      onChange={handleInputChange}
                      placeholder="App password"
                      className={`w-full px-3 py-2 border rounded-lg ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      From Email
                    </label>
                    <input
                      type="email"
                      name="fromEmail"
                      value={formData.fromEmail || ''}
                      onChange={handleInputChange}
                      placeholder="alerts@yourdomain.com"
                      className={`w-full px-3 py-2 border rounded-lg ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      To Email
                    </label>
                    <input
                      type="email"
                      name="toEmail"
                      value={formData.toEmail || ''}
                      onChange={handleInputChange}
                      placeholder="admin@yourdomain.com"
                      className={`w-full px-3 py-2 border rounded-lg ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

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
            Save Notification Settings
          </button>
        </div>
      </form>
    </div>
  );
};
