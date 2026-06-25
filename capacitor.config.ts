import type { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'live.mathracer.app',
  appName: 'Math Racer',
  version: '1.3.7',
  webDir: 'dist/public',
  ios: {
    contentInset: 'never'
  }
};

export default config;
