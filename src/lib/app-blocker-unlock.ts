import { AppBlocker } from '@/plugins/app-blocker';

const UNLOCK_STORAGE_KEY = 'kaiwa_unlock_expiry';

export type UnlockStatus = {
  active: boolean;
  expiresAt: number;
};

export async function getUnlockStatus(): Promise<UnlockStatus> {
  try {
    const status = await AppBlocker.isUnlockActive();
    if (status.active && status.expiresAt) {
      localStorage.setItem(UNLOCK_STORAGE_KEY, String(status.expiresAt));
    } else {
      localStorage.removeItem(UNLOCK_STORAGE_KEY);
    }
    return status;
  } catch {
    const stored = localStorage.getItem(UNLOCK_STORAGE_KEY);
    if (stored) {
      const expiresAt = parseInt(stored, 10);
      if (Date.now() < expiresAt) {
        return { active: true, expiresAt };
      }
      localStorage.removeItem(UNLOCK_STORAGE_KEY);
    }
    return { active: false, expiresAt: 0 };
  }
}

/** Mark unlock in native storage and sync localStorage from the native expiry. */
export async function grantUnlock(): Promise<UnlockStatus> {
  await AppBlocker.markFlashcardsCompleted();
  return getUnlockStatus();
}

export function clearUnlockStorage(): void {
  localStorage.removeItem(UNLOCK_STORAGE_KEY);
}
