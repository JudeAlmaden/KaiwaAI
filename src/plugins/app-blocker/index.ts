import { registerPlugin } from '@capacitor/core';
import type { AppBlockerPlugin } from './definitions';

const AppBlocker = registerPlugin<AppBlockerPlugin>('AppBlocker', {
  web: () => import('./web').then(m => new m.AppBlockerWeb()),
});

export * from './definitions';
export { AppBlocker };
