import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.spentwise.app",
  appName: "SpentWise",
  webDir: "dist",
  server: {
    androidScheme: "http", // dev only
    cleartext: true, // dev only
  },
};

export default config;
