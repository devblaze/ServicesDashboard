import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApiClient } from '../services/SettingsApiClient.ts';
import type { AISettings, NotificationSettings, GeneralSettings, ServerMonitoringSettings } from '../types/SettingsInterfaces';

export const settingsKeys = {
  all: ['settings'] as const,
  ai: ['settings', 'ai'] as const,
  notifications: ['settings', 'notifications'] as const,
  general: ['settings', 'general'] as const,
  serverMonitoring: ['settings', 'server-monitoring'] as const,
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

export function useAvailableModels(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.models,
    queryFn: () => settingsApiClient.getAvailableModels(),
    enabled: enabled,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: false // Don't refetch when window regains focus
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

// Server Monitoring Settings hooks
export function useServerMonitoringSettings() {
  return useQuery({
    queryKey: settingsKeys.serverMonitoring,
    queryFn: () => settingsApiClient.getServerMonitoringSettings()
  });
}

export function useUpdateServerMonitoringSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: ServerMonitoringSettings) => settingsApiClient.updateServerMonitoringSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.serverMonitoring });
    }
  });
}
