import type { CapacitorConfig } from '@capacitor/cli';

const devUrl = process.env.CAPACITOR_SERVER_URL;
const isHttps = devUrl?.toLowerCase().startsWith('https://');

const config: CapacitorConfig = {
  appId: 'com.kaiwaai.app',
  appName: 'KaiwaAI',
  webDir: 'out',
  ...(devUrl ? { server: { url: devUrl, cleartext: !isHttps } } : {}),
  plugins: {
    AppBlocker: {
      enabled: true
    }
  }
};

export default config;
