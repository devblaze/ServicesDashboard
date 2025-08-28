import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings, TestTube2, Check, AlertCircle, Loader2, Bot, ChevronDown, ChevronUp } from 'lucide-react';
import { settingsApi } from '../services/networkDiscoveryApi';
import type { OllamaSettings as OllamaSettingsType } from '../types/networkDiscovery';

interface OllamaSettingsProps {
    darkMode?: boolean;
}

interface TestResult {
    success: boolean;
    message: string;
}

export const OllamaSettings: React.FC<OllamaSettingsProps> = ({ darkMode = true }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [testResult, setTestResult] = useState<TestResult | null>(null);

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
        onError: (error: Error) => {
            setTestResult({ 
                success: false, 
                message: error.message || 'Failed to save settings' 
            });
        }
    });

    // Test connection mutation
    const testMutation = useMutation({
        mutationFn: settingsApi.testOllamaConnection,
        onSuccess: (result: boolean) => {
            setTestResult({
                success: result,
                message: result ? 'Connection successful!' : 'Connection failed!'
            });
        },
        onError: (error: Error) => {
            setTestResult({ 
                success: false, 
                message: error.message || 'Connection test failed' 
            });
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

    const toggleSettings = () => {
        setIsOpen(!isOpen);
        // Clear test result when closing
        if (isOpen) {
            setTestResult(null);
        }
    };

    if (isLoading) {
        return (
            <div className={`flex items-center justify-center p-8 rounded-2xl border ${
                darkMode 
                    ? 'bg-gray-800/50 border-gray-700/50 backdrop-blur-sm' 
                    : 'bg-white/80 border-gray-200/50 backdrop-blur-sm shadow-lg'
            }`}>
                <div className="text-center">
                    <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-3 ${
                        darkMode ? 'text-blue-400' : 'text-blue-600'
                    }`} />
                    <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Loading AI settings...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
            darkMode 
                ? 'bg-gray-800/50 border-gray-700/50 shadow-lg shadow-gray-900/20' 
                : 'bg-white/80 border-gray-200/50 shadow-lg shadow-gray-200/20'
        }`}>
            {/* Header */}
            <div className="p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-xl ${
                            darkMode ? 'bg-purple-900/50' : 'bg-purple-100/50'
                        }`}>
                            <Bot className={`w-6 h-6 ${
                                darkMode ? 'text-purple-400' : 'text-purple-600'
                            }`} />
                        </div>
                        <div>
                            <h2 className={`text-xl font-semibold ${
                                darkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                                AI Service Recognition
                            </h2>
                            <p className={`text-sm ${
                                darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                Configure Ollama for intelligent service detection
                            </p>
                        </div>
                    </div>
                    
                    <button
                        onClick={toggleSettings}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 group ${
                            darkMode
                                ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white'
                                : 'bg-gray-100/50 hover:bg-gray-200/50 text-gray-600 hover:text-gray-900'
                        } hover:scale-105 active:scale-95`}
                    >
                        <Settings className="w-4 h-4 transition-transform group-hover:rotate-12" />
                        <span>{isOpen ? 'Hide' : 'Configure'}</span>
                        {isOpen ? (
                            <ChevronUp className="w-4 h-4 transition-transform" />
                        ) : (
                            <ChevronDown className="w-4 h-4 transition-transform" />
                        )}
                    </button>
                </div>
            </div>

            {/* Settings Form */}
            {isOpen && settings && (
                <div className={`border-t p-6 ${
                    darkMode ? 'border-gray-700/50' : 'border-gray-200/50'
                }`}>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* URL and Model Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className={`block text-sm font-medium ${
                                    darkMode ? 'text-gray-300' : 'text-gray-700'
                                }`}>
                                    Ollama Server URL
                                </label>
                                <input
                                    type="url"
                                    name="baseUrl"
                                    defaultValue={settings.baseUrl}
                                    placeholder="http://localhost:11434"
                                    className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                        darkMode
                                            ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:bg-gray-700'
                                            : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-white'
                                    }`}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className={`block text-sm font-medium ${
                                    darkMode ? 'text-gray-300' : 'text-gray-700'
                                }`}>
                                    Model
                                </label>
                                <select
                                    name="model"
                                    defaultValue={settings.model}
                                    className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                        darkMode
                                            ? 'bg-gray-700/50 border-gray-600 text-white focus:bg-gray-700'
                                            : 'bg-white/50 border-gray-300 text-gray-900 focus:bg-white'
                                    }`}
                                    required
                                >
                                    {availableModels.map((model: string) => (
                                        <option key={model} value={model}>{model}</option>
                                    ))}
                                    {availableModels.length === 0 && (
                                        <option value={settings.model}>{settings.model}</option>
                                    )}
                                </select>
                            </div>
                        </div>

                        {/* Timeout */}
                        <div className="space-y-2">
                            <label className={`block text-sm font-medium ${
                                darkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                                Timeout (seconds)
                            </label>
                            <input
                                type="number"
                                name="timeoutSeconds"
                                defaultValue={settings.timeoutSeconds}
                                min="5"
                                max="120"
                                className={`w-full max-w-xs px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    darkMode
                                        ? 'bg-gray-700/50 border-gray-600 text-white focus:bg-gray-700'
                                        : 'bg-white/50 border-gray-300 text-gray-900 focus:bg-white'
                                }`}
                                required
                            />
                        </div>

                        {/* Checkboxes */}
                        <div className="space-y-4">
                            <div className="flex items-start space-x-3">
                                <input
                                    type="checkbox"
                                    name="enableServiceRecognition"
                                    defaultChecked={settings.enableServiceRecognition}
                                    className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                    <label className={`block text-sm font-medium ${
                                        darkMode ? 'text-gray-300' : 'text-gray-700'
                                    }`}>
                                        Enable AI Service Recognition
                                    </label>
                                    <p className={`text-xs mt-1 ${
                                        darkMode ? 'text-gray-500' : 'text-gray-500'
                                    }`}>
                                        Use AI to automatically identify and categorize discovered services
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-3">
                                <input
                                    type="checkbox"
                                    name="enableScreenshots"
                                    defaultChecked={settings.enableScreenshots}
                                    className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                    <label className={`block text-sm font-medium ${
                                        darkMode ? 'text-gray-300' : 'text-gray-700'
                                    }`}>
                                        Enable Screenshots
                                    </label>
                                    <p className={`text-xs mt-1 ${
                                        darkMode ? 'text-gray-500' : 'text-gray-500'
                                    }`}>
                                        Capture screenshots of web services (requires additional setup)
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3 pt-4">
                            <button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    darkMode
                                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-900/25'
                                        : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25'
                                } hover:scale-105 active:scale-95`}
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
                                className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    darkMode
                                        ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg shadow-green-900/25'
                                        : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg shadow-green-500/25'
                                } hover:scale-105 active:scale-95`}
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
                            <div className={`p-4 rounded-xl border transition-all duration-300 ${
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
                                        <Check className="w-5 h-5 mr-3 flex-shrink-0" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                                    )}
                                    <span className="font-medium">{testResult.message}</span>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            )}
        </div>
    );
};