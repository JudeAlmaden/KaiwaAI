'use client';

import { ShieldWarning, DeviceMobile, X } from '@phosphor-icons/react';

interface SystemPermissionsCardProps {
  hasPermissions: boolean;
  usageStatsGranted: boolean;
  overlayGranted: boolean;
  isAndroid: boolean;
  showPermissionModal: boolean;
  modalFeedback: string | null;
  onRequestPermissions: () => void;
  onCloseModal: () => void;
  onCheckPermissionStatus: () => void;
}

export default function SystemPermissionsCard({
  hasPermissions,
  usageStatsGranted,
  overlayGranted,
  isAndroid,
  showPermissionModal,
  modalFeedback,
  onRequestPermissions,
  onCloseModal,
  onCheckPermissionStatus,
}: SystemPermissionsCardProps) {
  return (
    <>
      {/* Alert Banner ONLY rendered when permissions are missing */}
      {!hasPermissions && (
        <div className="rounded-3xl border-2 border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <ShieldWarning size={20} />
            </div>
            <div>
              <h4 className="font-display font-bold text-amber-700 dark:text-amber-400">
                System Permissions Required
              </h4>
              <p className="text-muted">
                Focus Guard needs Usage Access &amp; Display Over Apps permissions to intercept apps.
              </p>
            </div>
          </div>

          <button
            onClick={onRequestPermissions}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl shadow-xs transition active:scale-95 shrink-0"
          >
            Grant Permissions
          </button>
        </div>
      )}

      {/* Permission Guide Modal */}
      {showPermissionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onCloseModal}
        >
          <div
            className="relative w-full max-w-md rounded-3xl border-2 border-border bg-card p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onCloseModal}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-xl bg-muted/20 text-muted hover:bg-muted/40 hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-ai/10 text-indigo-ai flex items-center justify-center font-bold shrink-0">
                <DeviceMobile size={22} />
              </div>
              <div>
                <h3 className="font-display text-base font-extrabold text-foreground">
                  Android System Permissions
                </h3>
                <p className="text-xs text-muted">
                  Required permissions for Focus Guard interception.
                </p>
              </div>
            </div>

            {/* Permission Checklist */}
            <div className="space-y-2.5 pt-1">
              <div className="p-3.5 rounded-2xl border-2 border-border bg-background flex items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="font-display font-bold text-foreground">1. Usage Access Permission</h4>
                  <p className="text-[11px] text-muted">Detects when blocked apps are opened</p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                    usageStatsGranted ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'
                  }`}
                >
                  {usageStatsGranted ? 'Granted ✓' : 'Needed ⚠️'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl border-2 border-border bg-background flex items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="font-display font-bold text-foreground">2. Display Over Other Apps</h4>
                  <p className="text-[11px] text-muted">Shows flashcard review overlay on interception</p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                    overlayGranted ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'
                  }`}
                >
                  {overlayGranted ? 'Granted ✓' : 'Needed ⚠️'}
                </span>
              </div>
            </div>

            {modalFeedback && (
              <p className="text-xs font-bold text-indigo-ai bg-indigo-ai/10 p-3 rounded-2xl border border-indigo-ai/20">
                {modalFeedback}
              </p>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              {isAndroid && (
                <button
                  onClick={onRequestPermissions}
                  className="w-full sm:flex-1 py-2.5 px-4 bg-indigo-ai border-b-4 border-indigo-deep hover:brightness-105 text-white font-bold rounded-2xl text-xs shadow-xs transition active:translate-y-[2px]"
                >
                  Open Android Settings
                </button>
              )}

              <button
                onClick={onCheckPermissionStatus}
                className="w-full sm:w-auto py-2.5 px-4 border-2 border-border bg-card hover:bg-muted/10 text-foreground font-bold rounded-2xl text-xs transition active:scale-95"
              >
                Re-check Status
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
