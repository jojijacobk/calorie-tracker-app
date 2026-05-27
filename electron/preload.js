// Preload runs in an isolated context with access to Node APIs.
// We expose nothing sensitive — the renderer is a plain web app that
// uses the browser's own localStorage (which Electron persists natively).
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  platform: process.platform,
  isElectron: true,
});
