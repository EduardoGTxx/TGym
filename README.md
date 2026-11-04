# TGym 🏋️‍♂️

> **The privacy-first, local-first workout tracker and strength progression engine.**  
> Built for serious lifters, personal trainers, and athletes who value data ownership, fluid performance, and zero bloat.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20PWA%20%7C%20Web-emerald)](https://github.com/Truesilverking/TGym)
[![Status](https://img.shields.io/badge/Status-Active%20Development-success)](https://github.com/Truesilverking/TGym)

---

## ⚡ Overview

**TGym** is an offline-first, high-performance training management suite available as a native Android application and installable Progressive Web App (PWA). 

Designed to replace bloated, subscription-gated fitness apps, TGym puts precision strength programming into your pocket with zero ads, zero telemetry, and 100% offline operation. All your training data belongs to you—stored locally on your device with instant export and backup capabilities.

---

## ✨ Features

### 🏋️‍♂️ Workout Execution & Programming
- **Structured Routine Design**: Organize workouts with Warmups, Working Sets, Top Sets, Back-off Sets, Drop Sets, and Supersets/Circuits.
- **RIR / RPE Tracking**: Log Reps in Reserve (RIR) or Rate of Perceived Exertion (RPE) to manage session fatigue accurately.
- **Dynamic Rest Timers**: Floating rest countdown with background notifications, audio cues, and hands-free logging support.
- **Auto-Calculated Back-offs**: Configurable back-off repetitions (**Same reps** or **Increased reps**) maintaining exact training volumes.
- **Cardio & Bodyweight Modes**: Seamless support for repetition-based, time-based, and distance-based exercises.

### 📈 Progression & Fatigue Management
- **Automatic Load Progression**: Suggests increments based on your historical RIR and completed repetitions.
- **Deload Week System**: Easily initiate or schedule deload cycles that scale training volume while preserving workout configuration.
- **1RM & Fatigue Probes**: Built-in 1-Rep Max calculators (Brzycki, Epley) and monotonic fatigue monitoring.

### 📅 Streaks, Consistency & Calendar
- **Interactive Streak Flame**: Dynamic daily streak tracking with timezone-safe calendar normalization.
- **Consistency Heatmap**: Visual frequency matrix of training sessions, active days, and rest days.
- **Integrated Calendar**: Schedule upcoming routines and inspect historical sessions day-by-day.

### 📊 Measurements & Progress Reports
- **Body Composition Logging**: Track body weight, circumferences, caliper skinfolds, and InBody analysis metrics.
- **Export & Reports**: Generate publication-grade PDF progress reports and Excel/JSON data sheets.
- **Milestones & Records**: Automatic detection and celebration of personal bests (PRs) per exercise.

### 🔒 Privacy & Local-First Architecture
- **Offline-Ready**: Full core functionality works with zero internet connection.
- **Data Resiliency**: Multi-tier persistence with `localStorage`, IndexedDB mirror, and encrypted mobile file mirror (`framegym-state.json`).
- **Zero Lock-In**: Export portable JSON archives at any time; import without loss of exercise history or IDs.
- **Optional Self-Hosted Sync**: Connect your own private TGym API instance or Google Drive for multi-device sync.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/), [Zustand](https://github.com/pmndrs/zustand) (state management), [React Router 7](https://reactrouter.com/).
- **Mobile**: [Capacitor 7](https://capacitorjs.com/) with native Android plugins for notifications, biometrics, and audio.
- **PWA**: Service Worker caching with offline fallback and standalone app manifests.
- **Testing**: [Vitest](https://vitest.dev/) with Happy-DOM and LinkeDOM.
- **Styling**: Native CSS modern variables, Material 3 design palette, dark theme, and reduced-motion compliance.
- **Backend (Optional)**: Lightweight Node.js server for optional private profile synchronization.
- **MCP**: Read-only Model Context Protocol server exposing workout and calculation modules.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v22.x or higher
- **pnpm**: v10.x (`pnpm install -g pnpm@10`)
- **Android Development** (optional for native APK): JDK 21 and Android SDK 35

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Truesilverking/TGym.git
   cd TGym
   ```

2. **Install dependencies:**
   ```bash
   cd frontend
   pnpm install --frozen-lockfile
   ```

3. **Start the standalone development server:**
   ```bash
   pnpm run dev --mode standalone --host 127.0.0.1
   ```
   *Standalone mode uses an isolated browser-local profile and requires no backend API.*

---

## 🧪 Testing & Verification

Run the test suite and validation scripts from the `frontend/` directory:

```bash
# Run unit & component test suites
pnpm test

# Production web build
pnpm build

# Progressive Web App build
pnpm build:pwa

# Build mobile assets & synchronize Capacitor
pnpm build:mobile

# Locale and version validation
node scripts/check-locales.mjs
node scripts/check-source-strings.mjs
node scripts/check-version.mjs
pnpm run test:fatigue-probe
```

---

## 📱 Mobile Build (Android)

To compile the native Android package:

1. Build mobile web assets and sync Capacitor:
   ```bash
   cd frontend
   pnpm run build:mobile
   ```

2. Assemble the APK using Gradle:
   ```bash
   cd android
   ./gradlew assembleRelease lintRelease
   # On Windows: gradlew.bat assembleRelease lintRelease
   ```

*Android updates validate package identity, SHA-256 checksums, and signing keys before triggering system installation.*

---

## 🌿 Branching & Release Workflow

We maintain a strict two-branch workflow:

| Branch | Purpose |
| :--- | :--- |
| [`main`](https://github.com/Truesilverking/TGym/tree/main) | **Production-ready, stable releases.** Releases and APK builds are published exclusively from tags on `main`. |
| [`Dev`](https://github.com/Truesilverking/TGym/tree/Dev) | **Active development branch.** All features, fixes, and UI improvements land here first before merging into `main`. |

### Release Process
1. Complete changes and verify all tests pass on `Dev`.
2. Bump version in `frontend/package.json` and `frontend/android/app/build.gradle` (`versionCode` and `versionName`).
3. Verify release readiness with `node scripts/check-version.mjs`.
4. Merge `Dev` into `main`, push to origin, and create an annotated Git tag `vX.Y.Z`.
5. GitHub Actions builds and publishes the signed release automatically.

---

## 📄 License & Acknowledgments

- **License**: TGym is licensed under the **[GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE)**.
- **Origin**: TGym is derived from [openGym](https://gitlab.com/DuarteSantos8/opengym) created by Duarte Santos. We honor and preserve all original contributions and open-source lineage.
