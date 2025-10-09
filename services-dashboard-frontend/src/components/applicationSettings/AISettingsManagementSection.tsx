import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Bot, TestTube2, Check, AlertCircle, Loader2, Zap, Eye, Search, ChevronDown, Sparkles, Brain, Cpu, Gauge } from 'lucide-react';
import { useAISettings, useUpdateAISettings, useTestAIConnection, useAvailableModels } from '../../hooks/SettingsHooks';
import type { AISettings } from '../../types/SettingsInterfaces';

interface AISettingsSectionProps {
  darkMode?: boolean;
}

interface AIProvider {
  id: string;
  name: string;
  icon: React.ReactNode;
  defaultUrl: string;
  requiresApiKey: boolean;
  models: string[];
  description: string;
  color: string;
}

const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: <Sparkles className="w-6 h-6" />,
    defaultUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
    models: [
      'gpt-4-turbo-preview',
      'gpt-4',
      'gpt-4-32k',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k'
    ],
    description: 'ChatGPT & GPT-4 Models',
    color: 'green'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: <Brain className="w-6 h-6" />,
    defaultUrl: 'https://api.anthropic.com',
    requiresApiKey: true,
    models: [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0'
    ],
    description: 'Claude AI Models',
    color: 'purple'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: <Zap className="w-6 h-6" />,
    defaultUrl: 'https://api.deepseek.com/v1',
    requiresApiKey: true,
    models: [
      'deepseek-chat',
      'deepseek-coder',
      'deepseek-coder-33b',
      'deepseek-coder-33b-instruct',
      'deepseek-coder-6.7b',
      'deepseek-coder-6.7b-instruct',
      'deepseek-coder-1.3b'
    ],
    description: 'DeepSeek AI Models',
    color: 'orange'
  },
  {
    id: 'groq',
    name: 'Groq',
    icon: <Gauge className="w-6 h-6" />,
    defaultUrl: 'https://api.groq.com/openai/v1',
    requiresApiKey: true,
    models: [
      'llama3-70b-8192',
      'llama3-8b-8192',
      'mixtral-8x7b-32768',
      'gemma-7b-it',
      'gemma2-9b-it',
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'llama-3.2-1b-preview',
      'llama-3.2-3b-preview',
      'llama-3.2-11b-vision-preview',
      'llama-3.2-90b-vision-preview'
    ],
    description: 'Ultra-Fast LPU Inference',
    color: 'red'
  },
  {
    id: 'ollama',
    name: 'Ollama',
    icon: <Cpu className="w-6 h-6" />,
    defaultUrl: 'http://localhost:11434',
    requiresApiKey: false,
    models: [
      'llama2',
      'llama2:7b',
      'llama2:13b',
      'llama2:70b',
      'mistral',
      'mixtral',
      'codellama',
      'phi',
      'neural-chat',
      'starling-lm',
      'orca-mini'
    ],
    description: 'Local AI Models',
    color: 'blue'
  }
];

export const AISettingsSection: React.FC<AISettingsSectionProps> = ({ darkMode = true }) => {
  const [formData, setFormData] = useState<AISettings | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: settings, isLoading } = useAISettings();
  const { data: availableModels = [], refetch: refetchModels, isLoading: modelsLoading } = useAvailableModels();
  const updateMutation = useUpdateAISettings();
  const testMutation = useTestAIConnection();

  // Combine provider models with available models from API
  const allModels = useMemo(() => {
    const providerModels = selectedProvider?.models || [];
    const uniqueModels = new Set([...providerModels, ...availableModels]);
    return Array.from(uniqueModels).sort();
  }, [selectedProvider, availableModels]);

  // Filter models based on search
  const filteredModels = useMemo(() => {
    if (!modelSearch) return allModels;
    return allModels.filter(model =>
      model.toLowerCase().includes(modelSearch.toLowerCase())
    );
  }, [allModels, modelSearch]);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
      const provider = AI_PROVIDERS.find(p => p.id === settings.provider);
      setSelectedProvider(provider || AI_PROVIDERS[2]); // Default to Ollama
    }
  }, [settings]);

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };

    if (showModelDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModelDropdown]);

  const handleProviderSelect = (provider: AIProvider) => {
    setSelectedProvider(provider);
    setFormData(prev => prev ? {
      ...prev,
      provider: provider.id,
      baseUrl: provider.defaultUrl,
      model: provider.models[0] || prev.model
    } : null);
    setModelSearch('');
  };

  const handleModelSelect = (model: string) => {
    setFormData(prev => prev ? {
      ...prev,
      model
    } : null);
    setShowModelDropdown(false);
    setModelSearch(model);
  };

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
        {/* Provider Selection Cards */}
        <div>
          <label className={`block text-sm font-medium mb-3 ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Select AI Provider
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {AI_PROVIDERS.map(provider => {
              const isSelected = selectedProvider?.id === provider.id;
              const colorClasses = {
                green: {
                  selected: darkMode ? 'border-green-500 bg-green-900/20' : 'border-green-500 bg-green-50',
                  hover: darkMode ? 'hover:border-green-600' : 'hover:border-green-400',
                  icon: darkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-600'
                },
                purple: {
                  selected: darkMode ? 'border-purple-500 bg-purple-900/20' : 'border-purple-500 bg-purple-50',
                  hover: darkMode ? 'hover:border-purple-600' : 'hover:border-purple-400',
                  icon: darkMode ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-100 text-purple-600'
                },
                orange: {
                  selected: darkMode ? 'border-orange-500 bg-orange-900/20' : 'border-orange-500 bg-orange-50',
                  hover: darkMode ? 'hover:border-orange-600' : 'hover:border-orange-400',
                  icon: darkMode ? 'bg-orange-900/50 text-orange-400' : 'bg-orange-100 text-orange-600'
                },
                red: {
                  selected: darkMode ? 'border-red-500 bg-red-900/20' : 'border-red-500 bg-red-50',
                  hover: darkMode ? 'hover:border-red-600' : 'hover:border-red-400',
                  icon: darkMode ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-600'
                },
                blue: {
                  selected: darkMode ? 'border-blue-500 bg-blue-900/20' : 'border-blue-500 bg-blue-50',
                  hover: darkMode ? 'hover:border-blue-600' : 'hover:border-blue-400',
                  icon: darkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'
                }
              }[provider.color] || {
                selected: darkMode ? 'border-gray-500 bg-gray-900/20' : 'border-gray-500 bg-gray-50',
                hover: darkMode ? 'hover:border-gray-600' : 'hover:border-gray-400',
                icon: darkMode ? 'bg-gray-900/50 text-gray-400' : 'bg-gray-100 text-gray-600'
              };

              return (
                <div
                  key={provider.id}
                  onClick={() => handleProviderSelect(provider)}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? colorClasses.selected
                      : darkMode
                        ? `border-gray-700 bg-gray-800/50 ${colorClasses.hover}`
                        : `border-gray-200 bg-white ${colorClasses.hover}`
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Check className={`w-5 h-5 ${
                        darkMode ? 'text-green-400' : 'text-green-600'
                      }`} />
                    </div>
                  )}
                  <div className="flex flex-col items-center space-y-3">
                    <div className={`p-3 rounded-lg ${colorClasses.icon}`}>
                      {provider.icon}
                    </div>
                    <div className="text-center">
                      <h4 className={`font-semibold ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {provider.name}
                      </h4>
                      <p className={`text-xs mt-1 ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {provider.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Base URL */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {selectedProvider?.id === 'ollama' ? 'Ollama Server URL' : 'API Base URL'}
          </label>
          <input
            type="url"
            name="baseUrl"
            value={formData.baseUrl}
            onChange={handleInputChange}
            placeholder={selectedProvider?.defaultUrl}
            className={`w-full px-3 py-2 border rounded-lg ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
            required
          />
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            Default: {selectedProvider?.defaultUrl}
          </p>
        </div>

        {/* API Key for external providers */}
        {selectedProvider?.requiresApiKey && (
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
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              required
            />
          </div>
        )}

        {/* Searchable Model Selection */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Model
          </label>
          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className={`w-full px-3 py-2 pr-10 border rounded-lg cursor-pointer flex items-center justify-between ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 opacity-50" />
                <input
                  type="text"
                  value={modelSearch || formData.model}
                  onChange={(e) => {
                    setModelSearch(e.target.value);
                    setShowModelDropdown(true);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowModelDropdown(true);
                  }}
                  placeholder="Search or select a model..."
                  className="bg-transparent outline-none flex-1"
                />
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${
                showModelDropdown ? 'rotate-180' : ''
              }`} />
            </div>

            {/* Dropdown */}
            {showModelDropdown && (
              <div className={`absolute z-10 w-full mt-1 rounded-lg border shadow-lg max-h-60 overflow-auto ${
                darkMode
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}>
                {modelsLoading && (
                  <div className="p-3 text-center">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    <p className="text-sm mt-1">Loading models...</p>
                  </div>
                )}
                {!modelsLoading && filteredModels.length === 0 && (
                  <div className={`p-3 text-center text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    No models found
                  </div>
                )}
                {!modelsLoading && filteredModels.map(model => (
                  <div
                    key={model}
                    onClick={() => handleModelSelect(model)}
                    className={`px-3 py-2 cursor-pointer transition-colors ${
                      formData.model === model
                        ? darkMode
                          ? 'bg-blue-900/50 text-blue-300'
                          : 'bg-blue-100 text-blue-700'
                        : darkMode
                          ? 'hover:bg-gray-700 text-gray-300'
                          : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{model}</span>
                      {formData.model === model && (
                        <Check className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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