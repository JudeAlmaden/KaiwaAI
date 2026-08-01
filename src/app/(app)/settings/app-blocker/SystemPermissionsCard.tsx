'use client';

import { useState } from 'react';
import { ShieldCheck, DeviceMobile, X, CheckCircle, XCircle, ArrowsClockwise, ArrowRight } from '@phosphor-icons/react';

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  modalFeedback,
  onRequestPermissions,
  onCloseModal,
  onCheckPermissionStatus,
}: SystemPermissionsCardProps) {
  const [isRechecking, setIsRechecking] = useState(false);

  const handleRecheck = async () => {
    setIsRechecking(true);
    try {
      await onCheckPermissionStatus();
    } finally {
      setIsRechecking(false);
    }
  };

  return (
    <>
      {/* Permission Guide Modal */}
      {showPermissionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onCloseModal}
        >
          <div
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-border bg-card p-5 sm:p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pr-6">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                  hasPermissions ? 'bg-emerald-500/10 text-emerald-500' : 'bg-indigo-ai/10 text-indigo-ai'
                }`}>
                  {hasPermissions ? <ShieldCheck size={24} /> : <DeviceMobile size={24} />}
                </div>
                <div>
                  <h3 className="font-display text-base font-extrabold text-foreground">
                    Android System Permissions
                  </h3>
                  <p className="text-xs text-muted">
                    Required for Focus Guard app interception
                  </p>
                </div>
              </div>

              <button
                onClick={onCloseModal}
                className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-xl bg-muted/15 text-muted hover:bg-muted/30 hover:text-foreground transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Permission Checklist Cards */}
            <div className="space-y-3">
              {/* Permission 1: Usage Access */}
              <div className={`p-4 rounded-2xl border-2 transition-all ${
                usageStatsGranted
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-amber-500/30 bg-amber-500/5'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {usageStatsGranted ? (
                      <CheckCircle size={20} weight="fill" className="text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle size={20} weight="fill" className="text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="font-display font-bold text-foreground text-xs sm:text-sm">
                        1. Usage Access Permission
                      </h4>
                      <p className="text-[11px] text-muted mt-0.5 leading-snug">
                        Detects when blocked apps (e.g. YouTube, Chrome) are launched.
                      </p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                    usageStatsGranted
                      ? 'bg-emerald-500/15 text-emerald-600'
                      : 'bg-amber-500/15 text-amber-600'
                  }`}>
                    {usageStatsGranted ? 'Granted ✓' : 'Needed ⚠️'}
                  </span>
                </div>
              </div>

              {/* Permission 2: Display Over Other Apps */}
              <div className={`p-4 rounded-2xl border-2 transition-all ${
                overlayGranted
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-amber-500/30 bg-amber-500/5'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {overlayGranted ? (
                      <CheckCircle size={20} weight="fill" className="text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle size={20} weight="fill" className="text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="font-display font-bold text-foreground text-xs sm:text-sm">
                        2. Display Over Other Apps
                      </h4>
                      <p className="text-[11px] text-muted mt-0.5 leading-snug">
                        Shows the full-screen flashcard review screen when an app is intercepted.
                      </p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                    overlayGranted
                      ? 'bg-emerald-500/15 text-emerald-600'
                      : 'bg-amber-500/15 text-amber-600'
                  }`}>
                    {overlayGranted ? 'Granted ✓' : 'Needed ⚠️'}
                  </span>
                </div>
              </div>
            </div>

            {/* Success state callout if everything is granted */}
            {hasPermissions ? (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center justify-center gap-2">
                <CheckCircle size={18} weight="fill" />
                <span>All permissions granted! Focus Guard is ready.</span>
              </div>
            ) : null}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              <button
                onClick={onRequestPermissions}
                className="w-full sm:flex-1 py-3 px-4 bg-indigo-ai border-b-4 border-indigo-deep hover:brightness-105 text-white font-bold rounded-2xl text-xs shadow-xs transition active:translate-y-[2px] flex items-center justify-center gap-2"
              >
                <span>{isAndroid ? 'Open Android Settings' : 'Grant Permissions'}</span>
                <ArrowRight size={14} weight="bold" />
              </button>

              <button
                onClick={handleRecheck}
                disabled={isRechecking}
                className="w-full sm:w-auto py-3 px-4 border-2 border-border bg-card hover:bg-muted/10 text-foreground font-bold rounded-2xl text-xs transition active:scale-95 flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                <ArrowsClockwise size={14} className={isRechecking ? 'animate-spin' : ''} />
                <span>Re-check</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
