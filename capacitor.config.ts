import type { CapacitorConfig } from '@capacitor/cli';

const devUrl = process.env.CAPACITOR_SERVER_URL; // set in .env for local dev

const config: CapacitorConfig = {
  appId: 'com.kaiwaai.app',
  appName: 'KaiwaAI',
  webDir: 'out',
  ...(devUrl ? { server: { url: devUrl, cleartext: true } } : {}),
  plugins: {
    AppBlocker: {
      enabled: true
    }
  }
};

export default config;
