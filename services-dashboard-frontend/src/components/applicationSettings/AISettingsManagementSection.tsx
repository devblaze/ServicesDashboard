import React, { useState, useEffect } from 'react';
import { Bot, TestTube2, Check, AlertCircle, Loader2, Zap, Eye } from 'lucide-react';
import { useAISettings, useUpdateAISettings, useTestAIConnection, useAvailableModels } from '../../hooks/SettingsHooks';
import type { AISettings } from '../../types/SettingsInterfaces';

interface AISettingsSectionProps {
  darkMode?: boolean;
}

export const AISettingsSection: React.FC<AISettingsSectionProps> = ({ darkMode = true }) => {
  const [formData, setFormData] = useState<AISettings | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data: settings, isLoading } = useAISettings();
  const { data: models = [], refetch: refetchModels } = useAvailableModels();
  const updateMutation = useUpdateAISettings();
  const testMutation = useTestAIConnection();

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
      updateMutation.mutate(formData, {
        onSuccess: () => {
          setTestResult({ success: true, message: 'AI settings saved successfully!' });
        },
        onError: (error: any) => {
          setTestResult({ success: false, message: error.message || 'Failed to save settings' });
        }
      });
    }
  };

  const handleTest = () => {
    setTestResult(null);
    testMutation.mutate(undefined, {
      onSuccess: (result: boolean) => {
        setTestResult({
          success: result,
          message: result ? 'Connection successful!' : 'Connection failed!'
        });
        if (result) {
          refetchModels();
        }
      },
      onError: (error: any) => {
        setTestResult({ success: false, message: error.message || 'Connection test failed' });
      }
    });
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
        <div className={`p-2 rounded-lg ${darkMode ? 'bg-purple-900/50' : 'bg-purple-100'}`}>
          <Bot className={`w-5 h-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
        </div>
        <div>
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            AI Settings
          </h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Configure AI provider for service recognition
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Provider Selection */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            AI Provider
          </label>
          <select
            name="provider"
            value={formData.provider}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="ollama">Ollama (Local)</option>
            <option value="openai">OpenAI ChatGPT</option>
            <option value="anthropic">Anthropic Claude</option>
          </select>
        </div>

        {/* Base URL */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {formData.provider === 'ollama' ? 'Ollama Server URL' : 'API Base URL'}
          </label>
          <input
            type="url"
            name="baseUrl"
            value={formData.baseUrl}
            onChange={handleInputChange}
            placeholder={
              formData.provider === 'ollama' ? 'http://localhost:11434' :
              formData.provider === 'openai' ? 'https://api.openai.com/v1' :
              'https://api.anthropic.com'
            }
            className={`w-full px-3 py-2 border rounded-lg ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            required
          />
        </div>

        {/* API Key for external providers */}
        {formData.provider !== 'ollama' && (
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              API Key
            </label>
            <input
              type="password"
              name="apiKey"
              value={formData.apiKey || ''}
              onChange={handleInputChange}
              placeholder="Enter your API key"
              className={`w-full px-3 py-2 border rounded-lg ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              required
            />
          </div>
        )}

        {/* Model Selection */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Model
          </label>
          <select
            name="model"
            value={formData.model}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            required
          >
            {models.length > 0 ? (
              models.map((model: string) => (
                <option key={model} value={model}>{model}</option>
              ))
            ) : (
              <option value={formData.model}>{formData.model}</option>
            )}
          </select>
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
            name="timeoutSeconds"
            value={formData.timeoutSeconds}
            onChange={handleInputChange}
            min="5"
            max="120"
            className={`w-full max-w-xs px-3 py-2 border rounded-lg ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>

        {/* Feature Toggles */}
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              name="enableServiceRecognition"
              checked={formData.enableServiceRecognition}
              onChange={handleInputChange}
              className="rounded"
            />
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <label className={`text-sm font-medium ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Enable AI Service Recognition
              </label>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              name="enableScreenshots"
              checked={formData.enableScreenshots}
              onChange={handleInputChange}
              className="rounded"
            />
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4" />
              <label className={`text-sm font-medium ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Enable Screenshots
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
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
            Save Settings
          </button>

          <button
            type="button"
            onClick={handleTest}
            disabled={testMutation.isPending}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              darkMode
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            } disabled:opacity-50`}
          >
            {testMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <TestTube2 className="w-4 h-4 mr-2" />
            )}
            Test Connection
          </button>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`p-4 rounded-lg border ${
            testResult.success
              ? darkMode
                ? 'bg-green-900/20 border-green-600/50 text-green-300'
                : 'bg-green-50 border-green-200 text-green-700'
              : darkMode
                ? 'bg-red-900/20 border-red-600/50 text-red-300'
                : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <div className="flex items-center">
              {testResult.success ? (
                <Check className="w-5 h-5 mr-3" />
              ) : (
                <AlertCircle className="w-5 h-5 mr-3" />
              )}
              <span>{testResult.message}</span>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};