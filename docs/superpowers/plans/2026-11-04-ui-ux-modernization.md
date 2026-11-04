# UI/UX Modernization & Mobile Interface Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul TGym's visual presentation, alignment, responsive geometry, tactile feedback, and component layouts to match contemporary mobile standards (fluent, dynamic, responsive, and aesthetic), specifically addressing the streak badge overflow/alignment bug, decoupling and restyling routine action buttons into discrete rounded touch targets, and refining the bottom dock and card hierarchy.

**Architecture:** 
1. Harmonize `.header-streak` layout across `iron.css`, `index.css`, and `TrainingHome.css` with inline-flex alignment, proportional SVG flame dimensions, and centered tabular typography.
2. Refactor `.routine-row-actions` in `RoutineList.jsx` and CSS from fused zero-gap elements into discrete, accessible rounded/circular button targets (`gap: 6px`, individual surface backgrounds, tactile press feedback).
3. Modernize the bottom navigation dock (`#tabbar`) and center Start FAB, replacing the sharp polygon hexagon (`clip-path: var(--hex)`) with a refined circular/squircle floating action button with dynamic glow, elevation, and active states.
4. Elevate week schedule rows and routine cards in `Plan.jsx` and `Today.jsx` with clear hierarchy, subtle borders, and smooth micro-interactions.

**Tech Stack:** React 19, CSS3 (CSS Variables, Flexbox, Grid, color-mix, backdrop-filter, clamp), Vitest.

**Spec:** Audited UI/UX defects from mobile screenshots & user requirements:
1. **Streak Badge Misalignment & Flame Overflow**: In `Today.jsx` header, the flame SVG is vertically displaced (sits too low, overflowing bottom) and the streak number ("0") is shoved against the far right border. Must be balanced, centered, and proportional.
2. **Routine Action Buttons Fused Oval**: In `Routine.jsx` (`RoutineList.jsx`), the up-arrow, down-arrow, and info buttons are grouped inside an elongated oval with 0 gap, causing their backgrounds to touch and appear as an awkward pill. Must be decoupled into distinct circular or rounded-square buttons with appropriate touch targets and margins.
3. **Start FAB Shape**: The center Start button in `#tabbar` uses a sharp blue hexagon (`clip-path: var(--hex)`) that looks dated and disjointed from the rounded design system. It should be a polished modern floating action button with tactile elevation and smooth glow.
4. **Card Hierarchy & Tactile Feedback**: Week schedule and dashboard cards need better surface contrast, refined typography, and smooth `:active` scale transitions (`scale(0.97)`).

## Global Constraints
- Preserve all existing data attributes (`data-tour`, `data-routine-id`, `title`, `aria-label`) so all integration and accessibility tests pass.
- Preserve existing theme tokens for `dark`, `light`, and `amoled` themes.
- Maintain backward compatibility with `useStore` state shape.
- Run `pnpm test` in `frontend/` to ensure 100% test pass rate across all suites.
- Do not introduce new dependencies.

## Review Focus
1. Header streak badge flame is vertically centered relative to the streak number, with even left/right padding and no overflow clipping.
2. Routine row action buttons (`↑`, `↓`, `ⓘ`) render with visible gap (`gap: 6px`) as individual rounded buttons, never merging into an oval.
3. Disabled arrow buttons (`index === 0` or `index === rows.length - 1`) have reduced opacity and do not trigger click/reorder.
4. Bottom navigation center Start button is accessible, centered, and provides clear active/running workout indicators.
5. All 266 Vitest test suites continue to pass without error.

---

### Task 1: Fix Header Streak Badge Alignment and SVG Flame Proportions
**Files:**
- Modify: `frontend/src/views/TrainingHome.css:1-10`
- Modify: `frontend/src/styles/iron.css:253-257`
- Modify: `frontend/src/index.css:1574-1580`
- Test: `frontend/src/components/StreakSurfaces.test.jsx`
- Test: `frontend/src/views/Home.streak.test.jsx`

**Steps:**
- [x] Inspect existing styles for `.header-streak` in `TrainingHome.css`, `iron.css`, and `index.css`.
- [x] In `iron.css` and `TrainingHome.css`, remove the 40px flame height that forced vertical distortion; update `.header-streak` to `display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 0 12px 0 8px; height: 38px; min-width: 58px;`.
- [x] Constrain `.header-streak .streak-flame` to `width: 22px; height: 24px; flex-shrink: 0; display: block;` so it sits proportionally centered.
- [x] Set `.header-streak b` to `font-size: 18px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; display: inline-block;`.
- [x] Run `pnpm --dir frontend test src/components/StreakSurfaces.test.jsx src/views/Home.streak.test.jsx` to verify streak tests pass.

### Task 2: Decouple and Modernize Routine Row Action Buttons
**Files:**
- Modify: `frontend/src/components/RoutineList.jsx:75-80`
- Modify: `frontend/src/index.css:1745-1750`
- Modify: `frontend/src/styles/iron.css`
- Test: `frontend/src/components/RoutineList.test.jsx`

**Steps:**
- [x] In `frontend/src/index.css:1745`, update `.routine-row-actions` to `display: flex; align-items: center; gap: 6px; flex: none;`.
- [x] Restyle `.routine-row-actions .iconbtn` to have individual rounded geometry: `width: 36px; height: 36px; min-height: 36px; border-radius: var(--r-sm, 10px); background: var(--surface-2); border: 1px solid var(--panel-edge); color: var(--acc); display: inline-flex; align-items: center; justify-content: center; transition: transform var(--fast), background var(--fast);`.
- [x] Add active press scale `.routine-row-actions .iconbtn:active { transform: scale(0.92); background: var(--surface-3); }`.
- [x] Ensure disabled state `.routine-row-actions .iconbtn:disabled { opacity: 0.25; cursor: default; background: transparent; border-color: transparent; }`.
- [x] Run `pnpm --dir frontend test src/components/RoutineList.test.jsx` to verify all 10 routine list interaction tests pass.

### Task 3: Modernize Bottom Navigation Dock and Floating Start Action Button
**Files:**
- Modify: `frontend/src/styles/iron.css:219-231`
- Modify: `frontend/src/index.css:508-528`
- Modify: `frontend/src/components/NavigationDock.css`
- Test: `frontend/src/components/Tabbar.test.jsx`
- Test: `frontend/src/components/NavigationDock.test.jsx`

**Steps:**
- [x] In `iron.css`, replace the sharp polygon hexagon `clip-path: var(--hex)` on `#tabbar button.start .cir` and `::before` with a modern circular floating action button: `border-radius: 50%; width: 54px; height: 54px; box-shadow: 0 4px 14px color-mix(in srgb, var(--acc) 45%, transparent);`.
- [x] Ensure smooth `:active` feedback: `transform: scale(0.92);` with subtle tactile depth.
- [x] Style recording / active workout state with a subtle glowing pulse instead of `hex-ping`.
- [x] Retain all button labels, accessibility properties, and DOM query selectors.
- [x] Run `pnpm --dir frontend test src/components/Tabbar.test.jsx src/components/NavigationDock.test.jsx`.

### Task 4: Enhance Visual Hierarchy & Micro-Interactions across Plan and Home
**Files:**
- Modify: `frontend/src/views/Plan.jsx`
- Modify: `frontend/src/views/TrainingHome.css`
- Modify: `frontend/src/styles/iron.css`
- Test: `frontend/src/App.flows.test.jsx`

**Steps:**
- [x] Improve schedule item row styling in `Plan.jsx` (`.week-schedule .item`): subtle card border, clean tag contrast (`var(--acc)` for routines, subtle surface badge for Rest).
- [x] Add smooth tactile tap micro-interactions across list items and cards (`:active { transform: scale(0.985); }`).
- [x] Ensure clean spacing between "Guided", "New", and "Delete all routines" actions.
- [x] Run `pnpm --dir frontend test src/App.flows.test.jsx`.

### Task 5: Comprehensive Verification & Regression Testing
**Files:**
- Test: Entire frontend test suite (`pnpm test`)
- Build: `pnpm build`

**Steps:**
- [x] Execute `pnpm --dir frontend test` to ensure all 266 test suites pass without regression.
- [x] Execute `pnpm --dir frontend run build` to verify clean production compilation.
- [x] Inspect git diff to verify all changes are minimal, precise, and adhere to ponytail simplicity principles.
