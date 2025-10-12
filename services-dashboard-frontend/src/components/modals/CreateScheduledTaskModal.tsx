import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Calendar, Server, Terminal, Clock, Globe, AlertCircle, Check } from 'lucide-react';
import { serverManagementApi } from '../../services/serverManagementApi';
import { scheduledTasksApi } from '../../services/scheduledTasksApi';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import type { ManagedServer } from '../../types/ServerManagement';
import type { CreateScheduledTaskRequest } from '../../types/ScheduledTask';
import { CRON_PRESETS, TIMEZONES } from '../../types/ScheduledTask';

interface CreateScheduledTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  darkMode?: boolean;
}

export const CreateScheduledTaskModal: React.FC<CreateScheduledTaskModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  darkMode = true
}) => {
  const [formData, setFormData] = useState<CreateScheduledTaskRequest>({
    name: '',
    description: '',
    command: '',
    cronExpression: '0 0 * * * *', // Every hour by default
    timeZone: 'UTC',
    isEnabled: true,
    timeoutSeconds: 300,
    serverIds: []
  });

  const [cronValidation, setCronValidation] = useState<{ isValid: boolean; nextExecution?: string; error?: string }>({
    isValid: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch servers for selection
  const { data: servers = [] } = useQuery<ManagedServer[], Error>({
    queryKey: ['managed-servers'],
    queryFn: () => serverManagementApi.getServers(),
    enabled: isOpen,
  });

  // Validate cron expression on change
  useEffect(() => {
    const validateCron = async () => {
      if (formData.cronExpression) {
        try {
          const result = await scheduledTasksApi.validateCron({
            cronExpression: formData.cronExpression,
            timeZone: formData.timeZone
          });
          setCronValidation({
            isValid: result.isValid,
            nextExecution: result.nextExecution
          });
        } catch (err) {
          setCronValidation({
            isValid: false,
            error: 'Invalid cron expression'
          });
        }
      }
    };

    const debounce = setTimeout(validateCron, 500);
    return () => clearTimeout(debounce);
  }, [formData.cronExpression, formData.timeZone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.serverIds.length === 0) {
      setError('Please select at least one server');
      return;
    }

    if (!cronValidation.isValid) {
      setError('Please fix the cron expression');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await scheduledTasksApi.createTask(formData);
      onSuccess();
      onClose();
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      command: '',
      cronExpression: '0 0 * * * *',
      timeZone: 'UTC',
      isEnabled: true,
      timeoutSeconds: 300,
      serverIds: []
    });
    setCronValidation({ isValid: true });
    setError(null);
  };

  const toggleServer = (serverId: number) => {
    setFormData(prev => ({
      ...prev,
      serverIds: prev.serverIds.includes(serverId)
        ? prev.serverIds.filter(id => id !== serverId)
        : [...prev.serverIds, serverId]
    }));
  };

  const selectAllServers = () => {
    setFormData(prev => ({
      ...prev,
      serverIds: prev.serverIds.length === servers.length ? [] : servers.map(s => s.id)
    }));
  };

  // Handle ESC key to close modal
  useEscapeKey(onClose, isOpen && !isSubmitting);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className={`rounded-2xl border max-w-3xl w-full max-h-[90vh] overflow-hidden ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        {/* Header */}
        <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                darkMode ? 'bg-purple-900/50' : 'bg-purple-100'
              }`}>
                <Calendar className={`w-5 h-5 ${
                  darkMode ? 'text-purple-400' : 'text-purple-600'
                }`} />
              </div>
              <div>
                <h3 className={`text-xl font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Create Scheduled Task
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Schedule commands to run automatically
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {/* Error Display */}
            {error && (
              <div className={`p-4 rounded-lg border flex items-start space-x-3 ${
                darkMode
                  ? 'bg-red-900/20 border-red-600/50 text-red-300'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Task Name */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Task Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                placeholder="e.g., Daily backup"
              />
            </div>

            {/* Description */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                placeholder="What does this task do?"
              />
            </div>

            {/* Command */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Command *
              </label>
              <div className="relative">
                <Terminal className={`absolute left-3 top-3 w-4 h-4 ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <textarea
                  required
                  value={formData.command}
                  onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                  rows={3}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border font-mono text-sm ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  placeholder="e.g., /usr/local/bin/backup.sh"
                />
              </div>
            </div>

            {/* Cron Expression */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Schedule (Cron Expression) *
              </label>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {CRON_PRESETS.slice(0, 6).map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, cronExpression: preset.value })}
                      className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                        formData.cronExpression === preset.value
                          ? darkMode
                            ? 'bg-purple-600 text-white'
                            : 'bg-purple-500 text-white'
                          : darkMode
                            ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      <div className="font-medium">{preset.label}</div>
                      <div className={`text-xs ${
                        formData.cronExpression === preset.value
                          ? 'text-purple-100'
                          : darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {preset.description}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Clock className={`absolute left-3 top-3 w-4 h-4 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <input
                    type="text"
                    required
                    value={formData.cronExpression}
                    onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border font-mono text-sm ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    placeholder="0 0 * * * * (seconds, minutes, hours, day, month, day-of-week)"
                  />
                </div>
                {cronValidation.isValid && cronValidation.nextExecution && (
                  <div className={`flex items-center space-x-2 text-sm ${
                    darkMode ? 'text-green-400' : 'text-green-600'
                  }`}>
                    <Check className="w-4 h-4" />
                    <span>Next run: {new Date(cronValidation.nextExecution).toLocaleString()}</span>
                  </div>
                )}
                {!cronValidation.isValid && (
                  <div className={`flex items-center space-x-2 text-sm ${
                    darkMode ? 'text-red-400' : 'text-red-600'
                  }`}>
                    <AlertCircle className="w-4 h-4" />
                    <span>{cronValidation.error || 'Invalid cron expression'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Timezone */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Timezone
              </label>
              <div className="relative">
                <Globe className={`absolute left-3 top-3 w-4 h-4 ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <select
                  value={formData.timeZone}
                  onChange={(e) => setFormData({ ...formData, timeZone: e.target.value })}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Timeout */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Timeout (seconds)
              </label>
              <input
                type="number"
                min="10"
                max="3600"
                value={formData.timeoutSeconds}
                onChange={(e) => setFormData({ ...formData, timeoutSeconds: parseInt(e.target.value) || 300 })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-purple-500`}
              />
            </div>

            {/* Server Selection */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className={`text-sm font-medium ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Select Servers * ({formData.serverIds.length} selected)
                </label>
                <button
                  type="button"
                  onClick={selectAllServers}
                  className={`text-sm ${
                    darkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'
                  }`}
                >
                  {formData.serverIds.length === servers.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className={`max-h-48 overflow-y-auto rounded-lg border ${
                darkMode ? 'border-gray-600' : 'border-gray-300'
              }`}>
                {servers.length === 0 ? (
                  <div className={`p-4 text-center text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    No servers available. Please add servers first.
                  </div>
                ) : (
                  servers.map((server) => (
                    <label
                      key={server.id}
                      className={`flex items-center p-3 cursor-pointer transition-colors ${
                        darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      } ${darkMode ? 'border-gray-700' : 'border-gray-200'} border-b last:border-b-0`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.serverIds.includes(server.id)}
                        onChange={() => toggleServer(server.id)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <div className="ml-3 flex-1">
                        <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {server.name}
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {server.hostAddress} • {server.type}
                        </div>
                      </div>
                      <Server className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Enabled Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className={`text-sm font-medium ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Enable immediately
                </label>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Start running this task right away
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isEnabled: !formData.isEnabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.isEnabled
                    ? 'bg-purple-600'
                    : darkMode ? 'bg-gray-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.isEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className={`p-6 border-t flex justify-end space-x-3 ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              darkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !cronValidation.isValid || formData.serverIds.length === 0}
            className={`px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              darkMode
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
            }`}
          >
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
};
