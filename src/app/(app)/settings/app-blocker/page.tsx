'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { AppBlocker, type AppInfo, type AppBlockerConfig } from '@/plugins/app-blocker';
import type { BlockerStudyMode, BlockerNoDueAction } from '@/plugins/app-blocker/definitions';
import PageHeader from '@/app/(app)/PageHeader';
import Kai from '@/app/Kai';

import FocusGuardStatusCard from './FocusGuardStatusCard';
import AppManagerCard from './AppManagerCard';
import SystemPermissionsCard from './SystemPermissionsCard';

// Recommended popular apps for quick one-tap blocking
interface RecommendedApp {
  appName: string;
  packageName: string;
  domain: string;
  category: string;
}

const RECOMMENDED_APPS: RecommendedApp[] = [
  { appName: 'Google Chrome', packageName: 'com.android.chrome', domain: 'chrome.com', category: 'Browser' },
  { appName: 'YouTube', packageName: 'com.google.android.youtube', domain: 'youtube.com', category: 'Media' },
  { appName: 'Instagram', packageName: 'com.instagram.android', domain: 'instagram.com', category: 'Social' },
  { appName: 'TikTok', packageName: 'com.zhiliaoapp.musically', domain: 'tiktok.com', category: 'Social' },
  { appName: 'Facebook', packageName: 'com.facebook.katana', domain: 'facebook.com', category: 'Social' },
  { appName: 'X / Twitter', packageName: 'com.twitter.android', domain: 'x.com', category: 'Social' },
  { appName: 'Reddit', packageName: 'com.reddit.frontpage', domain: 'reddit.com', category: 'Social' },
  { appName: 'Netflix', packageName: 'com.netflix.mediaclient', domain: 'netflix.com', category: 'Media' },
];

const DEFAULT_CONFIG: Required<Pick<AppBlockerConfig, 'count' | 'blockChance' | 'unlockDurationMinutes' | 'reviewType' | 'direction' | 'studyMode' | 'practice' | 'noDueAction'>> = {
  count: 10,
  blockChance: 100,
  unlockDurationMinutes: 15,
  reviewType: 'vocabulary',
  direction: 'jp-to-en',
  studyMode: 'due',
  practice: false,
  noDueAction: 'autoOpen',
};

export default function AppBlockerSettings() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [usageStatsGranted, setUsageStatsGranted] = useState(false);
  const [overlayGranted, setOverlayGranted] = useState(false);
  const [blockedApps, setBlockedApps] = useState<string[]>([]);
  const [installedApps, setInstalledApps] = useState<AppInfo[]>([]);
  const [flashcardCount, setFlashcardCount] = useState(10);
  const [blockChance, setBlockChance] = useState<number>(100);
  const [unlockDurationMinutes, setUnlockDurationMinutes] = useState<number>(15);
  const [reviewType, setReviewType] = useState<'vocabulary' | 'kanji' | 'mixed'>(DEFAULT_CONFIG.reviewType);
  const [direction, setDirection] = useState<'jp-to-en' | 'en-to-jp' | 'mixed'>(DEFAULT_CONFIG.direction);
  const [studyMode, setStudyMode] = useState<BlockerStudyMode>(DEFAULT_CONFIG.studyMode);
  const [practice, setPractice] = useState<boolean>(DEFAULT_CONFIG.practice);
  const [noDueAction, setNoDueAction] = useState<BlockerNoDueAction>(DEFAULT_CONFIG.noDueAction);
  const [loading, setLoading] = useState(true);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'recommended' | 'all' | 'blocked' | 'unblocked'>('recommended');

  const isAndroid = Capacitor.getPlatform() === 'android';

  const loadSettings = useCallback(async () => {
    try {
      const [monitorStatus, permStatus, blocked, installed, config] = await Promise.all([
        AppBlocker.isMonitoring().catch(() => ({ active: false })),
        AppBlocker.checkPermissions().catch(() => ({ granted: false })),
        AppBlocker.getBlockedApps().catch(() => ({ apps: [] })),
        AppBlocker.getInstalledApps().catch(() => ({ apps: [] })),
        AppBlocker.getAppBlockerConfig().catch(() => DEFAULT_CONFIG as AppBlockerConfig),
      ]);

      setIsMonitoring(monitorStatus.active);
      setHasPermissions(permStatus.granted);
      setBlockedApps(blocked.apps || []);

      const deviceApps = (installed.apps || []).sort((a, b) =>
        (a.appName || '').localeCompare(b.appName || '')
      );
      setInstalledApps(deviceApps);

      if (config) {
        setFlashcardCount(config.count ?? 10);
        setBlockChance(config.blockChance ?? 100);
        setUnlockDurationMinutes(config.unlockDurationMinutes ?? 15);
        setReviewType(config.reviewType ?? 'vocabulary');
        setDirection(config.direction ?? 'jp-to-en');
        setStudyMode(config.studyMode ?? 'due');
        setPractice(config.practice ?? false);
        setNoDueAction(config.noDueAction ?? 'autoOpen');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSettings();
  }, [loadSettings]);

  const checkPermissionStatus = useCallback(async () => {
    try {
      const permStatus = await AppBlocker.checkPermissions();
      const granted = Boolean(permStatus.granted);
      const usage = Boolean(permStatus.usageStats);
      const overlay = Boolean(permStatus.overlay);

      setHasPermissions(granted);
      setUsageStatsGranted(usage);
      setOverlayGranted(overlay);

      if (granted) {
        setModalFeedback("✓ All required permissions are granted!");
      } else {
        setModalFeedback(`Status: Usage Access (${usage ? 'Granted ✓' : 'Needed ⚠️'}), Display Over Apps (${overlay ? 'Granted ✓' : 'Needed ⚠️'})`);
      }
      return granted;
    } catch (error) {
      console.error('Error checking permissions:', error);
      setModalFeedback("Error checking permissions.");
      return false;
    }
  }, []);

  useEffect(() => {
    if (showPermissionModal) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModalFeedback(null);
      checkPermissionStatus();
    }
  }, [showPermissionModal, checkPermissionStatus]);

  const requestPermissions = async () => {
    setShowPermissionModal(true);
    if (isAndroid) {
      try {
        const result = await AppBlocker.requestPermissions();
        setHasPermissions(result.granted);
      } catch (error) {
        console.error('Error requesting permissions:', error);
      }
    }
  };

  const toggleMonitoring = async () => {
    try {
      if (!hasPermissions && isAndroid) {
        setShowPermissionModal(true);
        return;
      }

      if (isMonitoring) {
        await AppBlocker.stopMonitoring();
        setIsMonitoring(false);
      } else {
        await AppBlocker.setFlashcardRequirement({ count: flashcardCount });
        // Ensure full config is saved before starting
        await AppBlocker.setAppBlockerConfig({
          count: flashcardCount,
          blockChance,
          unlockDurationMinutes,
          reviewType,
          direction,
          studyMode,
          practice,
          noDueAction,
        });
        await AppBlocker.startMonitoring();
        setIsMonitoring(true);
      }
    } catch (error) {
      console.error('Error toggling monitoring:', error);
    }
  };

  const toggleBlockApp = async (packageName: string) => {
    try {
      const isBlocked = blockedApps.includes(packageName);

      if (isBlocked) {
        await AppBlocker.removeBlockedApp({ packageName });
        setBlockedApps(prev => prev.filter(p => p !== packageName));
      } else {
        await AppBlocker.addBlockedApp({ packageName });
        setBlockedApps(prev => [...prev, packageName]);
      }
    } catch (error) {
      console.error('Error toggling app block:', error);
    }
  };

  const updateFlashcardCount = async (count: number) => {
    const validCount = Math.max(1, Math.min(100, count));
    setFlashcardCount(validCount);
    try {
      await AppBlocker.setFlashcardRequirement({ count: validCount });
      await AppBlocker.setAppBlockerConfig({ count: validCount });
    } catch (error) {
      console.error('Error updating flashcard count:', error);
    }
  };

  const handleUpdateConfig = useCallback(async (updates: {
    count?: number;
    blockChance?: number;
    unlockDurationMinutes?: number;
    reviewType?: 'mixed' | 'vocabulary' | 'kanji';
    direction?: 'jp-to-en' | 'en-to-jp' | 'mixed';
    studyMode?: BlockerStudyMode;
    practice?: boolean;
    noDueAction?: BlockerNoDueAction;
  }) => {
    // Apply optimistic UI state
    if (updates.count !== undefined) setFlashcardCount(updates.count);
    if (updates.blockChance !== undefined) setBlockChance(updates.blockChance);
    if (updates.unlockDurationMinutes !== undefined) setUnlockDurationMinutes(updates.unlockDurationMinutes);
    if (updates.reviewType !== undefined) setReviewType(updates.reviewType);
    if (updates.direction !== undefined) setDirection(updates.direction);
    if (updates.studyMode !== undefined) setStudyMode(updates.studyMode);
    if (updates.practice !== undefined) setPractice(updates.practice);
    if (updates.noDueAction !== undefined) setNoDueAction(updates.noDueAction);

    try {
      // count has its own legacy setter; mirror in config too
      if (updates.count !== undefined) {
        await AppBlocker.setFlashcardRequirement({ count: updates.count });
      }
      await AppBlocker.setAppBlockerConfig(updates);
    } catch (error) {
      console.error('Error updating blocker config:', error);
    }
  }, []);

  const recommendedInstalledApps = useMemo(() => {
    const distractingPackages = [
      { packageName: 'com.android.chrome', domain: 'chrome.com', category: 'Browser' },
      { packageName: 'com.google.android.youtube', domain: 'youtube.com', category: 'Media' },
      { packageName: 'com.instagram.android', domain: 'instagram.com', category: 'Social' },
      { packageName: 'com.zhiliaoapp.musically', domain: 'tiktok.com', category: 'Social' },
      { packageName: 'com.ss.android.ugc.trill', domain: 'tiktok.com', category: 'Social' },
      { packageName: 'com.facebook.katana', domain: 'facebook.com', category: 'Social' },
      { packageName: 'com.facebook.orca', domain: 'messenger.com', category: 'Social' },
      { packageName: 'com.twitter.android', domain: 'x.com', category: 'Social' },
      { packageName: 'com.reddit.frontpage', domain: 'reddit.com', category: 'Social' },
      { packageName: 'com.netflix.mediaclient', domain: 'netflix.com', category: 'Media' },
      { packageName: 'org.telegram.messenger', domain: 'telegram.org', category: 'Social' },
      { packageName: 'com.whatsapp', domain: 'whatsapp.com', category: 'Social' },
      { packageName: 'com.snapchat.android', domain: 'snapchat.com', category: 'Social' },
      { packageName: 'com.pinterest', domain: 'pinterest.com', category: 'Social' },
      { packageName: 'com.discord', domain: 'discord.com', category: 'Social' },
    ];

    if (installedApps.length > 0) {
      const matches: { appName: string; packageName: string; domain: string; category: string }[] = [];

      installedApps.forEach(installedApp => {
        const pkgLower = installedApp.packageName.toLowerCase();
        const distMatch = distractingPackages.find(d => d.packageName.toLowerCase() === pkgLower);
        if (distMatch) {
          matches.push({
            appName: installedApp.appName,
            packageName: installedApp.packageName,
            domain: distMatch.domain,
            category: distMatch.category,
          });
        }
      });

      if (matches.length > 0) {
        return matches;
      }
    }

    return RECOMMENDED_APPS;
  }, [installedApps]);

  const allAvailableApps = useMemo(() => {
    const appMap = new Map<string, { appName: string; packageName: string; domain?: string }>();

    if (installedApps.length > 0) {
      installedApps.forEach(app => {
        appMap.set(app.packageName, { appName: app.appName, packageName: app.packageName });
      });
    } else {
      RECOMMENDED_APPS.forEach(rec => {
        appMap.set(rec.packageName, { appName: rec.appName, packageName: rec.packageName, domain: rec.domain });
      });
    }

    return Array.from(appMap.values()).sort((a, b) => a.appName.localeCompare(b.appName));
  }, [installedApps]);

  const filteredApps = useMemo(() => {
    return allAvailableApps.filter(app => {
      const matchesSearch =
        app.appName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.packageName.toLowerCase().includes(searchQuery.toLowerCase());

      const isBlocked = blockedApps.includes(app.packageName);

      if (!matchesSearch) return false;
      if (activeTab === 'blocked') return isBlocked;
      if (activeTab === 'unblocked') return !isBlocked;
      return true;
    });
  }, [allAvailableApps, searchQuery, activeTab, blockedApps]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Kai size={64} className="animate-bounce" />
        <p className="text-sm font-bold text-muted font-display">Kai is preparing your settings...</p>
      </div>
    );
  }

  return (
    <div className="pb-28 sm:pb-10">
      <PageHeader
        title="App Blocker"
        jp="アプリブロッカー"
        subtitle="Intercept distracting apps while studying Japanese."
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4 sm:px-8">
        {/* Status Card + Rules Summary & Edit Trigger */}
        <FocusGuardStatusCard
          isMonitoring={isMonitoring}
          blockedCount={blockedApps.length}
          flashcardCount={flashcardCount}
          blockChance={blockChance}
          unlockDurationMinutes={unlockDurationMinutes}
          reviewType={reviewType}
          direction={direction}
          studyMode={studyMode}
          practice={practice}
          noDueAction={noDueAction}
          hasPermissions={hasPermissions}
          usageStatsGranted={usageStatsGranted}
          overlayGranted={overlayGranted}
          onToggleMonitoring={toggleMonitoring}
          onRequestPermissions={requestPermissions}
          onUpdateFlashcardCount={updateFlashcardCount}
          onUpdateAppBlockerConfig={handleUpdateConfig}
        />

        {/* Application Interception Manager with Recommended Tab Default */}
        <AppManagerCard
          recommendedApps={recommendedInstalledApps}
          allAvailableApps={allAvailableApps}
          filteredApps={filteredApps}
          blockedApps={blockedApps}
          searchQuery={searchQuery}
          activeTab={activeTab}
          onSearchChange={setSearchQuery}
          onTabChange={setActiveTab}
          onToggleBlockApp={toggleBlockApp}
        />

        {/* Permission Modal */}
        <SystemPermissionsCard
          hasPermissions={hasPermissions}
          usageStatsGranted={usageStatsGranted}
          overlayGranted={overlayGranted}
          isAndroid={isAndroid}
          showPermissionModal={showPermissionModal}
          modalFeedback={modalFeedback}
          onRequestPermissions={requestPermissions}
          onCloseModal={() => setShowPermissionModal(false)}
          onCheckPermissionStatus={checkPermissionStatus}
        />
      </div>
    </div>
  );
}
