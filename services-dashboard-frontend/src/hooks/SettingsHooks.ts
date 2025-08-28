import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApiClient } from '../services/SettingsApiClient.ts';
import type { AISettings, NotificationSettings, GeneralSettings } from '../types/SettingsInterfaces';

export const settingsKeys = {
  all: ['settings'] as const,
  ai: ['settings', 'ai'] as const,
  notifications: ['settings', 'notifications'] as const,
  general: ['settings', 'general'] as const,
  models: ['settings', 'ai', 'models'] as const,
};

// AI Settings hooks
export function useAISettings() {
  return useQuery({
    queryKey: settingsKeys.ai,
    queryFn: () => settingsApiClient.getAISettings()
  });
}

export function useUpdateAISettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (settings: AISettings) => settingsApiClient.updateAISettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.ai });
      queryClient.invalidateQueries({ queryKey: settingsKeys.models });
    }
  });
}

export function useTestAIConnection() {
  return useMutation({
    mutationFn: () => settingsApiClient.testAIConnection()
  });
}

export function useAvailableModels() {
  return useQuery({
    queryKey: settingsKeys.models,
    queryFn: () => settingsApiClient.getAvailableModels(),
    enabled: false // Only fetch when explicitly requested
  });
}

// Notification Settings hooks
export function useNotificationSettings() {
  return useQuery({
    queryKey: settingsKeys.notifications,
    queryFn: () => settingsApiClient.getNotificationSettings()
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (settings: NotificationSettings) => settingsApiClient.updateNotificationSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.notifications });
    }
  });
}

// General Settings hooks
export function useGeneralSettings() {
  return useQuery({
    queryKey: settingsKeys.general,
    queryFn: () => settingsApiClient.getGeneralSettings()
  });
}

export function useUpdateGeneralSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (settings: GeneralSettings) => settingsApiClient.updateGeneralSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.general });
    }
  });
}
