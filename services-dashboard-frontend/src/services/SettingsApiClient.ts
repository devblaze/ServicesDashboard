import { BaseApiClient } from './BaseApiClient';
import type { AISettings, NotificationSettings, GeneralSettings, ServerMonitoringSettings, SettingsGroup } from '../types/SettingsInterfaces';

class SettingsApiClient extends BaseApiClient {
  constructor() {
    super({ serviceName: 'Settings API' });
  }

  // Get all settings grouped
  async getAllSettings(): Promise<SettingsGroup[]> {
    return this.request<SettingsGroup[]>('get', '/settings');
  }

  // AI Settings
  async getAISettings(): Promise<AISettings> {
    return this.request<AISettings>('get', '/settings/ai');
  }

  async updateAISettings(settings: AISettings): Promise<void> {
    return this.request<void>('post', '/settings/ai', settings);
  }

  async testAIConnection(): Promise<boolean> {
    return this.request<boolean>('post', '/settings/ai/test');
  }

  async getAvailableModels(): Promise<string[]> {
    return this.request<string[]>('get', '/settings/ai/models');
  }

  // Notification Settings
  async getNotificationSettings(): Promise<NotificationSettings> {
    return this.request<NotificationSettings>('get', '/settings/notifications');
  }

  async updateNotificationSettings(settings: NotificationSettings): Promise<void> {
    return this.request<void>('post', '/settings/notifications', settings);
  }

  // General Settings
  async getGeneralSettings(): Promise<GeneralSettings> {
    return this.request<GeneralSettings>('get', '/settings/general');
  }

  async updateGeneralSettings(settings: GeneralSettings): Promise<void> {
    return this.request<void>('post', '/settings/general', settings);
  }

  // Server Monitoring Settings
  async getServerMonitoringSettings(): Promise<ServerMonitoringSettings> {
    return this.request<ServerMonitoringSettings>('get', '/settings/server-monitoring');
  }

  async updateServerMonitoringSettings(settings: ServerMonitoringSettings): Promise<void> {
    return this.request<void>('post', '/settings/server-monitoring', settings);
  }
}

export const settingsApiClient = new SettingsApiClient();