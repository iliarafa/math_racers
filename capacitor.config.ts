import type { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'live.mathracer.app',
  appName: 'Math Racer',
  version: '1.1.0',
  webDir: 'dist/public',
  ios: {
    contentInset: 'never'
  }
};

export default config;
