export type BlockerStudyMode =
  | 'due'         // Only SRS-due cards (nextReview <= now)
  | 'all'         // Any cards (study ahead)
  | 'recent'      // Added in the last 7 days
  | 'struggling'  // Low ease factor (<2.0)
  | 'leeches';    // Many reviews but still short interval

export type BlockerNoDueAction =
  | 'autoOpen'    // Nothing due — just unlock and launch the blocked app
  | 'studyAny';   // Fallback to studyMode="all" (use any available cards)

export interface AppBlockerConfig {
  count: number; // Flashcard count requirement (e.g. 10)
  blockChance: number; // Interception probability percentage (1-100, default 100)
  unlockDurationMinutes: number; // Re-lock grace period in minutes (default 15)
  reviewType: 'vocabulary' | 'kanji' | 'mixed';
  direction: 'jp-to-en' | 'en-to-jp' | 'mixed';
  studyMode: BlockerStudyMode;
  practice: boolean; // If true, don't update SRS / learning status
  noDueAction: BlockerNoDueAction;
}

export interface AppBlockerPlugin {
  /**
   * Start monitoring for blocked apps
   */
  startMonitoring(): Promise<void>;

  /**
   * Stop monitoring
   */
  stopMonitoring(): Promise<void>;

  /**
   * Check if monitoring is active
   */
  isMonitoring(): Promise<{ active: boolean }>;

  /**
   * Add an app to the block list
   */
  addBlockedApp(options: { packageName: string }): Promise<void>;

  /**
   * Remove an app from the block list
   */
  removeBlockedApp(options: { packageName: string }): Promise<void>;

  /**
   * Get list of blocked apps
   */
  getBlockedApps(): Promise<{ apps: string[] }>;

  /**
   * Get list of installed apps
   */
  getInstalledApps(): Promise<{ apps: AppInfo[] }>;

  /**
   * Set flashcard requirement (number of cards to complete)
   */
  setFlashcardRequirement(options: { count: number }): Promise<void>;

  /**
   * Get target flashcard requirement count
   */
  getFlashcardRequirement(): Promise<{ count: number }>;

  /**
   * Get complete App Blocker configuration settings
   */
  getAppBlockerConfig(): Promise<AppBlockerConfig>;

  /**
   * Update App Blocker configuration settings
   */
  setAppBlockerConfig(config: Partial<AppBlockerConfig>): Promise<void>;

  /**
   * Mark flashcards as completed
   */
  markFlashcardsCompleted(): Promise<void>;

  /**
   * Check if the unlock grace period is currently active
   */
  isUnlockActive(): Promise<{ active: boolean; expiresAt: number }>;

  /**
   * Launch a specific app by package name
   */
  launchApp(options: { packageName: string }): Promise<void>;

  /**
   * Request required permissions
   */
  requestPermissions(options?: { type?: 'usageStats' | 'overlay' }): Promise<{ granted: boolean; usageStats?: boolean; overlay?: boolean }>;

  /**
   * Check if all required permissions are granted
   */
  checkPermissions(): Promise<{ granted: boolean; usageStats?: boolean; overlay?: boolean }>;

  /**
   * Check if device has an active network connection
   */
  isNetworkAvailable(): Promise<{ connected: boolean }>;
}

export interface AppInfo {
  packageName: string;
  appName: string;
  icon?: string;
}
