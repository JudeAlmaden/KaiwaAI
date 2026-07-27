import { WebPlugin } from '@capacitor/core';
import type { AppBlockerPlugin, AppInfo, AppBlockerConfig } from './definitions';

export class AppBlockerWeb extends WebPlugin implements AppBlockerPlugin {
  private config: AppBlockerConfig = {
    count: 10,
    blockChance: 100,
    unlockDurationMinutes: 15,
    reviewType: 'vocabulary',
    direction: 'jp-to-en',
    studyMode: 'due',
    practice: false,
    noDueAction: 'autoOpen',
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

  async addBlockedApp(_: { packageName: string }): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    console.log('App blocking not supported on web');
  }

  async removeBlockedApp(_: { packageName: string }): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
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

  async isUnlockActive(): Promise<{ active: boolean; expiresAt: number }> {
    return { active: false, expiresAt: 0 };
  }

  async launchApp(_: { packageName: string }): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    console.log('App launching not supported on web');
  }

  async requestPermissions(_?: { type?: 'usageStats' | 'overlay' }): Promise<{ granted: boolean; usageStats?: boolean; overlay?: boolean }> { // eslint-disable-line @typescript-eslint/no-unused-vars
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
