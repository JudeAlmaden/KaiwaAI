'use client';

import { DeviceMobile, MagnifyingGlass, Lock, LockOpen, Sparkle } from '@phosphor-icons/react';

interface RecommendedApp {
  appName: string;
  packageName: string;
  domain: string;
  category: string;
}

interface AppItem {
  appName: string;
  packageName: string;
  domain?: string;
}

interface AppManagerCardProps {
  recommendedApps: RecommendedApp[];
  allAvailableApps: AppItem[];
  filteredApps: AppItem[];
  blockedApps: string[];
  searchQuery: string;
  activeTab: 'recommended' | 'all' | 'blocked' | 'unblocked';
  onSearchChange: (query: string) => void;
  onTabChange: (tab: 'recommended' | 'all' | 'blocked' | 'unblocked') => void;
  onToggleBlockApp: (packageName: string) => void;
}

export default function AppManagerCard({
  recommendedApps,
  allAvailableApps,
  filteredApps,
  blockedApps,
  searchQuery,
  activeTab,
  onSearchChange,
  onTabChange,
  onToggleBlockApp,
}: AppManagerCardProps) {
  const displayedApps = activeTab === 'recommended'
    ? recommendedApps.filter(app =>
        app.appName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.packageName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredApps;

  return (
    <section className="rounded-3xl border-2 border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
      {/* Top Bar: Title & Search */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-ai/10 text-indigo-ai flex items-center justify-center font-bold shrink-0">
            <DeviceMobile size={18} />
          </div>
          <h2 className="font-display text-base font-bold text-foreground shrink-0">App Manager</h2>
        </div>

        {/* Compact Search */}
        <div className="relative flex-1 max-w-[180px]">
          <MagnifyingGlass
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-full h-8 pl-8 pr-2.5 rounded-xl border border-border bg-background text-xs outline-none focus:border-indigo-ai transition"
          />
        </div>
      </div>

      {/* Clean Filter Tabs Bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl border border-border bg-background text-xs font-bold overflow-x-auto">
        <button
          onClick={() => onTabChange('recommended')}
          className={`flex-1 py-1 px-1.5 sm:px-2 rounded-lg transition flex items-center justify-center gap-1 text-[10px] sm:text-[11px] whitespace-nowrap ${
            activeTab === 'recommended' ? 'bg-card text-amber-600 shadow-xs' : 'text-muted hover:text-foreground'
          }`}
        >
          <Sparkle size={12} weight="fill" className="text-amber-500 shrink-0" />
          <span className="whitespace-nowrap">Recommended ({recommendedApps.length})</span>
        </button>

        <button
          onClick={() => onTabChange('blocked')}
          className={`flex-1 py-1 px-1.5 sm:px-2 rounded-lg transition text-[10px] sm:text-[11px] whitespace-nowrap ${
            activeTab === 'blocked' ? 'bg-card text-rose-500 shadow-xs' : 'text-muted hover:text-foreground'
          }`}
        >
          <span className="whitespace-nowrap">Blocked ({blockedApps.length})</span>
        </button>

        <button
          onClick={() => onTabChange('all')}
          className={`flex-1 py-1 px-1.5 sm:px-2 rounded-lg transition text-[10px] sm:text-[11px] whitespace-nowrap ${
            activeTab === 'all' ? 'bg-card text-foreground shadow-xs' : 'text-muted hover:text-foreground'
          }`}
        >
          <span className="whitespace-nowrap">All ({allAvailableApps.length})</span>
        </button>
      </div>

      {/* Clean Single-Row App Items */}
      {displayedApps.length === 0 ? (
        <div className="py-6 text-center rounded-xl border border-dashed border-border text-muted">
          <p className="text-xs font-bold text-foreground">No apps found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-0.5">
          {displayedApps.map((app) => {
            const isBlocked = blockedApps.includes(app.packageName);
            return (
              <div
                key={app.packageName}
                className={`flex items-center justify-between p-2.5 rounded-2xl border transition gap-2 ${
                  isBlocked
                    ? 'border-rose-500/30 bg-rose-500/5'
                    : 'border-border bg-background hover:border-indigo-ai/30'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 ${
                      isBlocked ? 'bg-rose-500/20 text-rose-600' : 'bg-indigo-ai/10 text-indigo-ai'
                    }`}
                  >
                    {app.appName.charAt(0)}
                  </div>
                  <p className="font-display text-xs font-bold text-foreground truncate">{app.appName}</p>
                </div>

                <button
                  onClick={() => onToggleBlockApp(app.packageName)}
                  className={`min-h-[32px] px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition shrink-0 active:scale-95 border ${
                    isBlocked
                      ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                      : 'border-border bg-card hover:bg-muted/10 text-foreground'
                  }`}
                >
                  {isBlocked ? (
                    <>
                      <Lock size={12} />
                      <span>Blocked</span>
                    </>
                  ) : (
                    <>
                      <LockOpen size={12} />
                      <span>+ Block</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
