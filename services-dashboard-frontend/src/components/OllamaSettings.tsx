import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings, TestTube2, Check, AlertCircle, Loader2, Bot } from 'lucide-react';
import { settingsApi } from '../services/networkDiscoveryApi';
import type { OllamaSettings as OllamaSettingsType } from '../types/networkDiscovery';

interface OllamaSettingsProps {
    darkMode?: boolean;
}

export const OllamaSettings: React.FC<OllamaSettingsProps> = ({ darkMode = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const queryClient = useQueryClient();

    // Get current settings
    const { data: settings, isLoading } = useQuery({
        queryKey: ['ollama-settings'],
        queryFn: settingsApi.getOllamaSettings
    });

    // Get available models
    const { data: availableModels = [] } = useQuery({
        queryKey: ['ollama-models'],
        queryFn: settingsApi.getAvailableModels,
        enabled: !!settings?.baseUrl
    });

    // Update settings mutation
    const updateMutation = useMutation({
        mutationFn: settingsApi.updateOllamaSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ollama-settings'] });
            queryClient.invalidateQueries({ queryKey: ['ollama-models'] });
            setTestResult({ success: true, message: 'Settings saved successfully!' });
        },
        onError: (error: any) => {
            setTestResult({ success: false, message: error.response?.data || 'Failed to save settings' });
        }
    });

    // Test connection mutation
    const testMutation = useMutation({
        mutationFn: settingsApi.testOllamaConnection,
        onSuccess: (result) => {
            setTestResult({
                success: result,
                message: result ? 'Connection successful!' : 'Connection failed!'
            });
        },
        onError: (error: any) => {
            setTestResult({ success: false, message: error.response?.data || 'Connection test failed' });
        }
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const updatedSettings: OllamaSettingsType = {
            baseUrl: formData.get('baseUrl') as string,
            model: formData.get('model') as string,
            enableServiceRecognition: formData.get('enableServiceRecognition') === 'on',
            enableScreenshots: formData.get('enableScreenshots') === 'on',
            timeoutSeconds: parseInt(formData.get('timeoutSeconds') as string) || 30
        };

        updateMutation.mutate(updatedSettings);
    };

    const handleTest = () => {
        setTestResult(null);
        testMutation.mutate();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        );
    }

    return (
        <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    <Bot className="w-5 h-5 mr-2" />
                    <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        AI Service Recognition
                    </h2>
                </div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`p-2 rounded-md ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                    <Settings className="w-5 h-5" />
                </button>
            </div>

            {isOpen && settings && (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Ollama Server URL
                            </label>
                            <input
                                type="url"
                                name="baseUrl"
                                defaultValue={settings.baseUrl}
                                placeholder="http://localhost:11434"
                                className={`w-full px-3 py-2 border rounded-md ${
                                    darkMode
                                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                }`}
                                required
                            />
                        </div>

                        <div>
                            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Model
                            </label>
                            <select
                                name="model"
                                defaultValue={settings.model}
                                className={`w-full px-3 py-2 border rounded-md ${
                                    darkMode
                                        ? 'bg-gray-700 border-gray-600 text-white'
                                        : 'bg-white border-gray-300 text-gray-900'
                                }`}
                                required
                            >
                                {availableModels.map(model => (
                                    <option key={model} value={model}>{model}</option>
                                ))}
                                {availableModels.length === 0 && (
                                    <option value={settings.model}>{settings.model}</option>
                                )}
                            </select>
                        </div>

                        <div>
                            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Timeout (seconds)
                            </label>
                            <input
                                type="number"
                                name="timeoutSeconds"
                                defaultValue={settings.timeoutSeconds}
                                min="5"
                                max="120"
                                className={`w-full px-3 py-2 border rounded-md ${
                                    darkMode
                                        ? 'bg-gray-700 border-gray-600 text-white'
                                        : 'bg-white border-gray-300 text-gray-900'
                                }`}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex flex-col space-y-2">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="enableServiceRecognition"
                                defaultChecked={settings.enableServiceRecognition}
                                className="mr-2"
                            />
                            <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                Enable AI Service Recognition
              </span>
                        </label>

                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="enableScreenshots"
                                defaultChecked={settings.enableScreenshots}
                                className="mr-2"
                            />
                            <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                Enable Screenshots (requires additional setup)
              </span>
                        </label>
                    </div>

                    <div className="flex space-x-3">
                        <button
                            type="submit"
                            disabled={updateMutation.isPending}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {testMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <TestTube2 className="w-4 h-4 mr-2" />
                            )}
                            Test Connection
                        </button>
                    </div>

                    {testResult && (
                        <div className={`p-3 rounded-md ${
                            testResult.success
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-red-50 border border-red-200'
                        }`}>
                            <div className="flex items-center">
                                {testResult.success ? (
                                    <Check className="w-4 h-4 text-green-500 mr-2" />
                                ) : (
                                    <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                                )}
                                <span className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                  {testResult.message}
                </span>
                            </div>
                        </div>
                    )}
                </form>
            )}
        </div>
    );
};