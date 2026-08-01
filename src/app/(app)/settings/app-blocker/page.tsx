'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { AppBlocker, type AppInfo, type AppBlockerConfig } from '@/plugins/app-blocker';
import type { BlockerStudyMode, BlockerNoDueAction } from '@/plugins/app-blocker/definitions';
import PageHeader from '@/app/(app)/PageHeader';
import Kai from '@/app/Kai';

import FocusGuardStatusCard from './FocusGuardStatusCard';
import AppManagerCard from './AppManagerCard';
import SystemPermissionsCard from './SystemPermissionsCard';
import DebugFab from '@/components/DebugFab';

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

const DEFAULT_CONFIG: Required<Pick<AppBlockerConfig, 'count' | 'blockChance' | 'unlockDurationMinutes' | 'reviewType' | 'direction' | 'studyMode' | 'practice' | 'noDueAction' | 'earlyReviewStrategy'>> = {
  count: 10,
  blockChance: 100,
  unlockDurationMinutes: 15,
  reviewType: 'vocabulary',
  direction: 'jp-to-en',
  studyMode: 'all',
  practice: false,
  noDueAction: 'autoOpen',
  earlyReviewStrategy: 'practice',
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
  const [earlyReviewStrategy, setEarlyReviewStrategy] = useState<'practice' | 'proportional'>(DEFAULT_CONFIG.earlyReviewStrategy);
  const [loading, setLoading] = useState(true);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<string | null>(null);

  // Debug mode — available on PC during development or when NEXT_PUBLIC_APP_BLOCKER_DEBUG is true
  const isAndroid = Capacitor.getPlatform() === 'android';
  const debugEnabled =
    process.env.NEXT_PUBLIC_APP_BLOCKER_DEBUG === 'true' ||
    (process.env.NODE_ENV === 'development' && !isAndroid);

  const [debugMode, setDebugMode] = useState(true);
  const [debugMonitoring, setDebugMonitoring] = useState(true);
  const [debugHasPermissions, setDebugHasPermissions] = useState(false);
  const [debugUsageGranted, setDebugUsageGranted] = useState(false);
  const [debugOverlayGranted, setDebugOverlayGranted] = useState(false);
  const [debugBlockedCount, setDebugBlockedCount] = useState(3);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'recommended' | 'all' | 'blocked' | 'unblocked'>('recommended');

  // When debug mode is active, override the real state with debug values
  const effectiveIsMonitoring = debugEnabled && debugMode ? debugMonitoring : isMonitoring;
  const effectiveHasPermissions = debugEnabled && debugMode ? debugHasPermissions : hasPermissions;
  const effectiveUsageGranted = debugEnabled && debugMode ? debugUsageGranted : usageStatsGranted;
  const effectiveOverlayGranted = debugEnabled && debugMode ? debugOverlayGranted : overlayGranted;
  const effectiveBlockedCount = debugEnabled && debugMode ? debugBlockedCount : blockedApps.length;

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
        setStudyMode(config.studyMode ?? 'all');
        setPractice(config.practice ?? false);
        setNoDueAction(config.noDueAction ?? 'autoOpen');
        setEarlyReviewStrategy(config.earlyReviewStrategy ?? 'practice');
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
          earlyReviewStrategy,
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
    earlyReviewStrategy?: 'practice' | 'proportional';
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
    if (updates.earlyReviewStrategy !== undefined) setEarlyReviewStrategy(updates.earlyReviewStrategy);

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

  const pathname = usePathname();
  const isStandalonePage = pathname === '/settings/app-blocker';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Kai size={64} className="animate-bounce" />
        <p className="text-sm font-bold text-muted font-display">Kai is preparing your settings...</p>
      </div>
    );
  }

  return (
    <div className={isStandalonePage ? "pb-28 sm:pb-10" : ""}>
      {isStandalonePage && (
        <PageHeader
          title="App Blocker"
          jp="アプリブロッカー"
          subtitle="Intercept distracting apps while studying Japanese."
        />
      )}

      <div className={isStandalonePage ? "mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4 sm:px-8" : "flex w-full flex-col gap-4"}>

        {/* Status Card + Rules Summary & Edit Trigger */}
        <FocusGuardStatusCard
          isMonitoring={effectiveIsMonitoring}
          blockedCount={effectiveBlockedCount}
          flashcardCount={flashcardCount}
          blockChance={blockChance}
          unlockDurationMinutes={unlockDurationMinutes}
          reviewType={reviewType}
          direction={direction}
          studyMode={studyMode}
          practice={practice}
          noDueAction={noDueAction}
          earlyReviewStrategy={earlyReviewStrategy}
          hasPermissions={effectiveHasPermissions}
          usageStatsGranted={effectiveUsageGranted}
          overlayGranted={effectiveOverlayGranted}
          onToggleMonitoring={debugEnabled && debugMode ? () => setDebugMonitoring(v => !v) : toggleMonitoring}
          onRequestPermissions={requestPermissions}
          onCheckPermissionStatus={checkPermissionStatus}
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

      {/* Floating Debugger Button & Modal */}
      <DebugFab
        title="App Blocker Debugger"
        enabled={debugEnabled}
        active={debugMode}
        onToggleActive={setDebugMode}
      >
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Monitoring</span>
            <div className="flex gap-1">
              {([true, false] as const).map((v) => (
                <button
                  key={String(v)}
                  onClick={() => setDebugMonitoring(v)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                    debugMonitoring === v ? 'bg-indigo-ai text-white' : 'border border-border bg-background text-muted hover:text-foreground'
                  }`}
                >
                  {v ? 'Active' : 'Paused'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Blocked Count</span>
            <div className="flex gap-1">
              {[0, 3, 8].map((n) => (
                <button
                  key={n}
                  onClick={() => setDebugBlockedCount(n)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                    debugBlockedCount === n ? 'bg-amber-500 text-white' : 'border border-border bg-background text-muted hover:text-foreground'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Usage Access</span>
            <div className="flex gap-1">
              {([true, false] as const).map((v) => (
                <button
                  key={String(v)}
                  onClick={() => {
                    setDebugUsageGranted(v);
                    setDebugHasPermissions(v && debugOverlayGranted);
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                    debugUsageGranted === v ? 'bg-emerald-500 text-white' : 'border border-border bg-background text-muted hover:text-foreground'
                  }`}
                >
                  {v ? '✓ Granted' : '✗ Needed'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Display Over Apps</span>
            <div className="flex gap-1">
              {([true, false] as const).map((v) => (
                <button
                  key={String(v)}
                  onClick={() => {
                    setDebugOverlayGranted(v);
                    setDebugHasPermissions(debugUsageGranted && v);
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                    debugOverlayGranted === v ? 'bg-emerald-500 text-white' : 'border border-border bg-background text-muted hover:text-foreground'
                  }`}
                >
                  {v ? '✓ Granted' : '✗ Needed'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1 col-span-2 pt-2 border-t border-border">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">App Lock Preview</span>
            <button
              onClick={() => {
                const params = new URLSearchParams({
                  mode: 'app-blocker',
                  count: String(flashcardCount),
                  reviewType,
                  direction,
                  studyMode,
                  practice: practice ? '1' : '0',
                  noDueAction,
                  earlyReviewStrategy,
                });
                window.open(`/app-lock?${params.toString()}`, '_blank');
              }}
              className="w-full py-2 rounded-xl text-xs font-bold bg-indigo-ai text-white hover:bg-indigo-ai/90 transition"
            >
              Open App Lock Page →
            </button>
            <p className="text-[10px] text-muted text-center">Opens with current config settings</p>
          </div>
        </div>
      </DebugFab>
    </div>
  );
}
