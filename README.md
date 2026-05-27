# Calorie Tracker — Desktop (macOS) + iOS

One React codebase, two native targets:
- **macOS** via **Electron** (like Slack / VS Code)
- **iOS (iPhone 16 Pro Max & others)** via **Capacitor** — the same
  `src/` web build runs in a native `WKWebView` inside a real Xcode app.

Your data persists locally via `localStorage`. In both shells this is
real on-disk storage (in the Capacitor iOS app it lives in the app's
sandbox container and is **not** subject to Safari's storage eviction),
so entries, settings, and last-view survive quits and restarts.

---

## iOS — build & run on iPhone 16 Pro Max

### Prerequisites
- A **Mac** with **Xcode 15+** installed (from the App Store).
- **CocoaPods**: `sudo gem install cocoapods` (or `brew install cocoapods`).
- **Node 18+**.
- To run on a *physical* iPhone you need an Apple ID. A **free** Apple ID
  allows 7-day on-device provisioning; an **Apple Developer Program**
  membership ($99/yr) is needed for longer installs and the App Store.
  The iOS **Simulator** needs no account.

### Steps
```bash
cd calorie-tracker
npm install                 # installs web + Capacitor deps
npm run ios:add             # one-time: builds web + creates the ios/ Xcode project
npm run ios:open            # builds, syncs, and opens the project in Xcode
```
In Xcode:
1. Select the **Calorie Tracker** target → **Signing & Capabilities** →
   choose your Team (your Apple ID). Xcode auto-generates a bundle ID
   signature.
2. Pick **iPhone 16 Pro Max** (Simulator) or your connected device in the
   run-destination dropdown.
3. Press **▶ Run**.

### After changing the React code
```bash
npm run ios:sync            # rebuilds web and copies it into the iOS project
```
Then re-run from Xcode. (`ios:open` also syncs each time.)

### iOS-native touches included
- Safe-area handling for the **Dynamic Island** and **home indicator**
  via `env(safe-area-inset-*)` + `viewport-fit=cover`
- Light status-bar glyphs over the dark UI (`@capacitor/status-bar`)
- Zoom locked for a native app feel; the Electron drag strip is
  automatically suppressed on iOS
- Mobile single-column layout auto-activates (≤560px logical width;
  the 16 Pro Max is 440pt) with 44px touch targets
- CSV import uses the native iOS **Files** picker via the standard file input

> **App Store note:** shipping to the App Store requires the paid Apple
> Developer Program, an app icon set, and a privacy/notarization pass.
> For personal use, the free 7-day device install or the Simulator is enough.

---

## macOS — Electron

## Stack
- **React 18 + Vite** — the UI (your existing CalorieTracker component)
- **Recharts** — stacked macro bar charts
- **Electron 31** — native window, menu bar, dock, packaging

## Prerequisites
- **Node.js 18+** and npm. Check with `node -v`.
- macOS (for producing a `.dmg`/`.app`). The dev mode runs anywhere.

## 1. Install
```bash
cd calorie-tracker
npm install
```

## 2. Run in development (hot reload)
```bash
npm run dev
```
This starts Vite on `http://localhost:5173` and launches the Electron
window pointing at it, with DevTools open. Edits to `src/` reload live.

## 3. Run the production build locally
```bash
npm start
```
Builds the React app to `dist/` and opens it in Electron from the
bundled files (no dev server).

## 4. Package a distributable macOS app
```bash
npm run dist
```
Produces, in `release/`:
- `Calorie Tracker-1.0.0-arm64.dmg` (Apple Silicon)
- `Calorie Tracker-1.0.0-x64.dmg` (Intel)
- matching `.zip` archives

Drag the app from the `.dmg` into **Applications** and launch it like any
native app. It appears in the Dock and the menu bar.

> **Unsigned build note:** This config builds an *unsigned* app. On first
> launch macOS Gatekeeper may warn it's from an unidentified developer —
> right-click the app → **Open**, or run
> `xattr -cr "/Applications/Calorie Tracker.app"`. For distribution to
> others, add an Apple Developer ID and enable signing + notarization in
> `package.json` → `build.mac`.

## App icon (optional)
A default Electron icon is used unless you provide one. To set a custom
icon, drop a `build/icon.icns` (1024×1024 source recommended). Quick way
to generate one from a PNG:
```bash
mkdir icon.iconset
sips -z 512 512 source.png --out icon.iconset/icon_512x512.png
# ...add other sizes (16,32,128,256,512 + @2x)...
iconutil -c icns icon.iconset -o build/icon.icns
```

## macOS-native touches included
- Inset traffic-light title bar (`hiddenInset`) with a draggable top strip
- Under-window vibrancy / translucency, forced dark mode
- Window shown only when rendered (no white flash)
- Single-instance lock (re-focuses the existing window)
- Standard macOS app + Edit + View + Window menus, Cmd+Q to quit
- External links open in the system browser

## Project layout
```
calorie-tracker/
├─ electron/
│  ├─ main.js            # macOS main process: window, menu, lifecycle
│  └─ preload.js         # secure bridge (minimal)
├─ src/
│  ├─ App.jsx            # the Calorie Tracker UI (shared by both targets)
│  ├─ main.jsx           # React entry
│  └─ index.css          # base + draggable titlebar styles
├─ index.html            # Vite entry (iOS safe-area viewport meta)
├─ capacitor.config.ts   # iOS app id, name, web dir
├─ vite.config.js
└─ package.json          # deps + electron-builder + capacitor scripts
   (ios/ is generated by `npm run ios:add` — a full Xcode project)
```

The single `src/App.jsx` detects its host at runtime (`IS_ELECTRON` /
`IS_NATIVE_IOS`) and adapts chrome accordingly, so both targets stay in
sync from one source of truth.
