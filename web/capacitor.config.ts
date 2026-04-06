import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fomo.chat',
  appName: 'FOMO Chat',
  webDir: 'dist',
  server: {
    // Load from remote server — always latest version, no need to rebuild APK
    url: 'https://fomo.talk',
    cleartext: false,
  },
  android: {
    backgroundColor: '#0f0f0f',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#dc2626',
    },
  },
};

export default config;
