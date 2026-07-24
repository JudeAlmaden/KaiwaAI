'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { AppBlocker, type AppInfo } from '@/plugins/app-blocker';
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

export default function AppBlockerSettings() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [usageStatsGranted, setUsageStatsGranted] = useState(false);
  const [overlayGranted, setOverlayGranted] = useState(false);
  const [blockedApps, setBlockedApps] = useState<string[]>([]);
  const [installedApps, setInstalledApps] = useState<AppInfo[]>([]);
  const [flashcardCount, setFlashcardCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'recommended' | 'all' | 'blocked' | 'unblocked'>('recommended');

  const isAndroid = Capacitor.getPlatform() === 'android';

  const loadSettings = useCallback(async () => {
    try {
      const [monitorStatus, permStatus, blocked, installed] = await Promise.all([
        AppBlocker.isMonitoring().catch(() => ({ active: false })),
        AppBlocker.checkPermissions().catch(() => ({ granted: false })),
        AppBlocker.getBlockedApps().catch(() => ({ apps: [] })),
        AppBlocker.getInstalledApps().catch(() => ({ apps: [] }))
      ]);

      setIsMonitoring(monitorStatus.active);
      setHasPermissions(permStatus.granted);
      setBlockedApps(blocked.apps || []);

      const deviceApps = (installed.apps || []).sort((a, b) =>
        (a.appName || '').localeCompare(b.appName || '')
      );

      setInstalledApps(deviceApps);
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
    } catch (error) {
      console.error('Error updating flashcard count:', error);
    }
  };

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
          hasPermissions={hasPermissions}
          onToggleMonitoring={toggleMonitoring}
          onRequestPermissions={requestPermissions}
          onUpdateFlashcardCount={updateFlashcardCount}
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
