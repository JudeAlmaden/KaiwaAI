import { WebPlugin } from '@capacitor/core';
import type { AppBlockerPlugin, AppInfo, AppBlockerConfig } from './definitions';

const STORAGE_KEY = 'kaiwa_app_blocker_config';

const DEFAULT_CONFIG: AppBlockerConfig = {
  count: 10,
  blockChance: 100,
  unlockDurationMinutes: 15,
  reviewType: 'vocabulary',
  direction: 'jp-to-en',
  studyMode: 'all',
  practice: false,
  noDueAction: 'autoOpen',
  earlyReviewStrategy: 'practice',
  showFurigana: true,
  furiganaMode: 'always',
  learningRatio: 0.5,
};

function loadPersistedConfig(): AppBlockerConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_CONFIG };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function persistConfig(config: AppBlockerConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

export class AppBlockerWeb extends WebPlugin implements AppBlockerPlugin {
  private config: AppBlockerConfig = loadPersistedConfig();

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
    this.config = { ...this.config, count: options.count };
    persistConfig(this.config);
  }

  async getFlashcardRequirement(): Promise<{ count: number }> {
    this.config = loadPersistedConfig();
    return { count: this.config.count };
  }

  async getAppBlockerConfig(): Promise<AppBlockerConfig> {
    this.config = loadPersistedConfig();
    return { ...this.config };
  }

  async setAppBlockerConfig(config: Partial<AppBlockerConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    persistConfig(this.config);
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
