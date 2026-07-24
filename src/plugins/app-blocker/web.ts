import { WebPlugin } from '@capacitor/core';
import type { AppBlockerPlugin, AppInfo, AppBlockerConfig } from './definitions';

export class AppBlockerWeb extends WebPlugin implements AppBlockerPlugin {
  private config: AppBlockerConfig = {
    count: 10,
    blockChance: 100,
    unlockDurationMinutes: 15,
    reviewType: 'vocabulary',
    direction: 'jp-to-en',
  };

  async startMonitoring(): Promise<void> {
    console.log('App blocking not supported on web');
  }

  async stopMonitoring(): Promise<void> {
    console.log('App blocking not supported on web');
  }

  async isMonitoring(): Promise<{ active: boolean }> {
    return { active: false };
  }

  async addBlockedApp(_options: { packageName: string }): Promise<void> {
    console.log('App blocking not supported on web');
  }

  async removeBlockedApp(_options: { packageName: string }): Promise<void> {
    console.log('App blocking not supported on web');
  }

  async getBlockedApps(): Promise<{ apps: string[] }> {
    return { apps: [] };
  }

  async getInstalledApps(): Promise<{ apps: AppInfo[] }> {
    return { apps: [] };
  }

  async setFlashcardRequirement(options: { count: number }): Promise<void> {
    this.config.count = options.count;
  }

  async getFlashcardRequirement(): Promise<{ count: number }> {
    return { count: this.config.count };
  }

  async getAppBlockerConfig(): Promise<AppBlockerConfig> {
    return { ...this.config };
  }

  async setAppBlockerConfig(config: Partial<AppBlockerConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
  }

  async markFlashcardsCompleted(): Promise<void> {
    console.log('App blocking not supported on web');
  }

  async launchApp(_options: { packageName: string }): Promise<void> {
    console.log('App launching not supported on web');
  }

  async requestPermissions(_options?: { type?: 'usageStats' | 'overlay' }): Promise<{ granted: boolean; usageStats?: boolean; overlay?: boolean }> {
    return { granted: false, usageStats: false, overlay: false };
  }

  async checkPermissions(): Promise<{ granted: boolean; usageStats?: boolean; overlay?: boolean }> {
    return { granted: false, usageStats: false, overlay: false };
  }

  async isNetworkAvailable(): Promise<{ connected: boolean }> {
    const connected = typeof navigator !== 'undefined' ? navigator.onLine : true;
    return { connected };
  }
}
