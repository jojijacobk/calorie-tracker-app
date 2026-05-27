import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.jojijacob.calorietracker",
  appName: "Calorie Tracker",
  webDir: "dist",
  backgroundColor: "#0d0e12",
  ios: {
    contentInset: "automatic",
    backgroundColor: "#0d0e12",
    scrollEnabled: true,
  },
};

export default config;
