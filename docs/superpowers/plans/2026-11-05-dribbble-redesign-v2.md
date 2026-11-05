# TGym 2.0.0 Global Dribbble UI/UX Redesign & Clean Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform TGym into a clean, modern fitness app globally identical to the Dribbble Workout App design (Zoltán Czékmány), streamline the Home view to contain solely the Dribbble hero components plus the week calendar workouts and bodyweight progress, and bump the version to 2.0.0 (versionCode 158).

**Architecture:** 
- Centralize Dribbble theme tokens (card radii, soft elevation shadows, floating navy curved dock, 4-color exercise badges) in `frontend/src/styles/iron.css` and `TrainingHome.css`.
- Refactor `Home.jsx` to eliminate clutter (`metric-grid`, `ConsistencyCard`, `TrainingHistory`, redundant plan blocks), retaining strictly: Dribbble greeting header, 4 activity hero cards (Walk, Cycling, Gym, Climbing), week training calendar with today's routine row, and bodyweight progress card.
- Apply the Dribbble exercise card design pattern (colored square badges, bold titles, rep targets, linear progress bars) globally across Routine, Workout, and Plan views.
- Bump version to `2.0.0` (Android `versionCode 157 -> 158`) with rollover rule support.

**Tech Stack:** React 19, Vite, Vitest, CSS3 variables & animations, Capacitor/Android Gradle.

**Spec:** User prompt & reference [Workout App on Dribbble](https://dribbble.com/shots/15435434-Workout-App) (user uploaded screenshot `media_1793884852396_d2517530.jpg`).

## Global Constraints

- Preserve all workout tracking, timer, deload, deload status, superset, and sync invariants (`AGENTS.md`).
- Version must bump to `2.0.0` and `versionCode 158` in both `frontend/package.json` and `frontend/android/app/build.gradle`.
- Retain week training calendar with today's workout row (`TodayWeekCalendar` / `today-row home-next-workout`).
- Retain body weight progress card (`home-bodyweight-card`).
- Eliminate all other non-Dribbble elements from the main menu (`Home.jsx`).
- Maintain 100% test pass rate across all Vitest suites (264 test files).

## Review Focus

1. `Home.jsx` renders strictly: Header (Avatar, greeting, bell, streak) -> 4 Hero Activity Cards -> Week Training Calendar -> Bodyweight Progress.
2. Streak badge and flame (`.header-streak`) remain functional and accessible in the Dribbble header.
3. Body weight logging and goal sheets remain fully interactive and accessible.
4. Exercise rows across Workout, RoutineEdit, and Plan display with the Dribbble card style (colored square badges, clean typography, progress bar).
5. All automated Vitest tests pass without regressions.

---

### Task 1: Bump Version to 2.0.0 (versionCode 158)

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/android/app/build.gradle`
- Test: `frontend/scripts/check-version.mjs`

- [ ] Update `frontend/package.json` version from `1.15.121` to `2.0.0`.
- [ ] Update `frontend/android/app/build.gradle` `versionCode` to `158` and `versionName` to `"2.0.0"`.
- [ ] Run `node scripts/check-version.mjs` with `PREVIOUS_VERSION_CODE=157` in `frontend/` to confirm version validation passes.

---

### Task 2: Streamline Main Menu (`Home.jsx`) to Dribbble Core + Calendar & Bodyweight

**Files:**
- Modify: `frontend/src/views/Home.jsx`
- Modify: `frontend/src/views/TrainingHome.css`
- Test: `frontend/src/views/Home.calendar.test.jsx`
- Test: `frontend/src/views/Home.bodyweight.test.jsx`
- Test: `frontend/src/views/Home.streak.test.jsx`

- [ ] Remove `metric-grid` (`Completion`, `Body Weight` metric link, `Nutrition` kcal link) from `Home.jsx`.
- [ ] Remove `ConsistencyCard` container (`#training-consistency`) from `Home.jsx`.
- [ ] Remove `DailyPlan` and `TrainingHistory` prompt blocks from `Home.jsx` (since today's scheduled workout is already handled in the calendar strip and the Gym card).
- [ ] Remove the blank welcome guided plan card from `Home.jsx`.
- [ ] Ensure `Home.jsx` renders in order:
  1. Dribbble Top Header (`.dribbble-top-header` with avatar, greeting, streak flame badge, and bell button)
  2. Dribbble 2x2 Activity Grid (Walk, Cycling, Gym, Climbing)
  3. Deload notice (compact banner only if deload is active)
  4. Week Training Calendar (`TodayWeekCalendar` with `.today-row.home-next-workout` to start/resume workout)
  5. Body Weight Progress (`home-bodyweight-card` with current weight, goal, and delta)
  6. Training pause action (only if paused)
- [ ] Update test assertions in `Home.calendar.test.jsx` and other Home tests if needed.
- [ ] Run `pnpm test src/views/Home.*.test.jsx` to verify all Home tests pass.

---

### Task 3: Global Dribbble Design System (Styles & Badges)

**Files:**
- Modify: `frontend/src/styles/iron.css`
- Modify: `frontend/src/views/TrainingHome.css`
- Modify: `frontend/src/index.css`

- [ ] Style all `.card` elements globally with Dribbble specs:
  - Surface: `#FFFFFF` (light mode), `#1E293B` (dark mode)
  - Border radius: `22px`
  - Shadow: `0 8px 24px -4px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.02)`
  - Border: `1px solid var(--panel-edge)`
- [ ] Refine `#tabbar` floating dock:
  - Background: `#0F172A` with curved pill radius (`28px`), subtle glow, white/accent active state.
- [ ] Add Dribbble exercise card styling:
  - Colored square badges with rounded corners (`14px`):
    - Badge Cyan: `#00B4D8` with white icon
    - Badge Purple: `#5B42F3` with white icon
    - Badge Amber: `#F59E0B` with white icon
    - Badge Coral: `#FF6536` with white icon
  - Horizontal linear progress bar for sets/reps:
    - Track: `var(--surface-2)` (height `6px`, border-radius `4px`)
    - Fill: matching badge color with smooth transition
  - Sleek typography: bold exercise name, clean reps metadata (`12reps · 36reps`).

---

### Task 4: Global Dribbble Styling in Routine, Plan, and Workout Views

**Files:**
- Modify: `frontend/src/views/Plan.jsx`
- Modify: `frontend/src/views/RoutineEdit.jsx`
- Modify: `frontend/src/views/Workout.jsx`
- Modify: `frontend/src/components/RoutineList.jsx`
- Test: `frontend/src/components/RoutineList.test.jsx`
- Test: `frontend/src/views/Workout.test.jsx`

- [ ] In `Plan.jsx` and `RoutineList.jsx`:
  - Apply the Dribbble card containers to routine list rows and week schedule items.
  - Cycle through the 4 vibrant badge colors (Cyan, Purple, Amber, Coral) for icons.
- [ ] In `RoutineEdit.jsx`:
  - Enhance exercise row display with colored square badges and target rep pills.
- [ ] In `Workout.jsx`:
  - Ensure active exercise cards show the Dribbble badge and progress bar (completed sets vs prescribed sets).
- [ ] Run `pnpm test src/views/Workout.test.jsx src/components/RoutineList.test.jsx src/views/Plan.order.test.jsx`.

---

### Task 5: Complete Verification, Build, and Git Commit/Push

**Files:**
- Test: Entire Vitest test suite (`pnpm test`)
- Build: PWA standalone build (`pnpm run build:pwa`)
- Build: Production web build (`pnpm run build`)

- [ ] Run full Vitest suite (`pnpm test` in `frontend/`) and ensure 264/264 test files pass.
- [ ] Run `pnpm run build:pwa` in `frontend/` and verify clean build.
- [ ] Run `pnpm run build` in `frontend/` and verify clean build.
- [ ] Commit all changes to `Dev` with message `feat(ui): global Dribbble redesign, clean main menu, and bump to v2.0.0`.
- [ ] Push `Dev` to `origin/Dev`.
- [ ] Merge `Dev` into `main`, push `main` to `origin/main`, tag `v2.0.0` and push tag to `origin`.
