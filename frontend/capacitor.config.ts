import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cz.integritty.roomdisplay',
  appName: 'Room Display',
  webDir: 'dist',
  server: {
    // For development, you can use a local server
    // url: 'http://10.0.2.2:3000',
    // cleartext: true,

    // For production, the app will use the built-in web assets
    // and connect to the production API via VITE_API_URL
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    // Enable full-screen mode for kiosk-like display
    // backgroundColor: '#1a1a2e',
  },
};

export default config;
