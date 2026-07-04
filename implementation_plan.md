# Implementation Plan: Home Tab & Game Fixes

## Summary of Changes

This plan covers 4 targeted fixes (Supabase advisory skipped per user instruction):

1. **[PRIORITY 1 — BLOCKER]** Fix Supabase save: progress and metrics never reach the DB
2. **[PRIORITY 2]** Remove sounds from the home tab only (tactile chess sounds untouched)
3. **[PRIORITY 3]** Remove "Brilliant Move" and bottom bouncing toasts from the chess page
4. **[PRIORITY 4]** Move hint feedback off the board, into the sidebar
5. **[PRIORITY 5]** Fix board shifting when a level ends

---

## Priority 1 — BLOCKER: Supabase Save is Broken (Root Cause Found)

### Root Cause — Missing Auth Token

The `saveProgress()` function inside [`useGameProgress.ts`](file:///c:/Users/isham/OneDrive/Desktop/coding/jgrbhjrbkhn/TPW/promo_event/src/hooks/useGameProgress.ts) makes a POST to `/api/student/game-progress` **without an Authorization header**:

```typescript
// ❌ Current (line 45-49) — No auth token sent
const res = await fetch('/api/student/game-progress', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },  // ← Missing Authorization!
  body: JSON.stringify({ studentId, levelId: id, isScenario, metrics }),
});
```

The API route (`route.ts` line 163) calls `verifyAuthAndMatch()` which **requires** a Bearer token — so every single save attempt is being rejected with `Authentication required`. This is why both Supabase tables (`rewards` and `tactile_level_progress`) have zero data.

The correct pattern already exists in [`gameLevelProgress.ts`](file:///c:/Users/isham/OneDrive/Desktop/coding/jgrbhjrbkhn/TPW/promo_event/src/lib/gameLevelProgress.ts) (line 73-79):
```typescript
// ✅ Correct pattern — includes auth token
const token = await getValidAccessToken();
const response = await fetch('/api/student/game-progress', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  },
  ...
});
```

### Fix

#### [MODIFY] [`useGameProgress.ts`](file:///c:/Users/isham/OneDrive/Desktop/coding/jgrbhjrbkhn/TPW/promo_event/src/hooks/useGameProgress.ts)

1. **Add `getValidAccessToken` import** — it is already exported from `supabase.ts` but not imported here
2. **In `saveProgress()`** — call `await getValidAccessToken()` and add the token to the fetch headers (matching the pattern in `gameLevelProgress.ts`)
3. **Also fix `fetchProgress()`** (the GET) — same problem: no auth token on the GET request either
4. **Replace both `alert()` calls** (lines 72 and 77) with `console.error()` — raw `alert()` breaks the user experience; the `PostGameAnalysis` popup is already showing on the screen so an alert on top is terrible UX

This single fix will make BOTH Supabase tables start receiving data correctly:
- `rewards` table — will get the candy award record
- `tactile_level_progress` — will get accuracy/time/stars

And the player will be able to proceed to the next level because `saveProgress` will return `{ success: true }` instead of failing.

---

## Priority 2 — Remove Home Tab Sounds Only

> [!IMPORTANT]
> **Scope**: Only sounds that play **within the home tab / dashboard** are removed. All sounds in `page.tsx` (tactile chess), `PostGameAnalysis.tsx`, and `ChessLevelGame.tsx` are **left completely untouched**.

### Home Tab Sound Audit — Plain English

| Sound | File | When It Plays | Action |
|---|---|---|---|
| `chime.wav` | `App.tsx` L654 | **Pre-loaded on app start** (just loading, not playing) | Remove preload |
| `success.mp3` | `App.tsx` L655 | **Pre-loaded on app start** | Remove preload |
| `tick.mp3` | `App.tsx` L656 | **Pre-loaded on app start** | Remove preload |
| `success.mp3` | `App.tsx` L713 | **When XP crosses a multiple of 30** (happens silently in background after any level completes) | ❌ Remove |
| `chime.wav` | `App.tsx` L806 | **When any mini-task/XP reward fires** | ❌ Remove |
| `chime.wav` | `App.tsx` L813 | **When level-up type reward fires** | ❌ Remove |
| `success.mp3` | `App.tsx` L819 | **When lesson-complete reward fires** | ❌ Remove |
| `chime.wav` | `App.tsx` L836 | **Every time you navigate to Profile** | ❌ Remove |
| `playSparkles()` sound | `App.tsx` L469 | **Clicking "Start Adventure" button** | ❌ Remove |
| `victory_beat.mp3` | `DashboardCastleWorld.tsx` L102-107 | Function defined but **never called** — dead code | Remove dead code |

### Files to Modify

#### [MODIFY] [`App.tsx`](file:///c:/Users/isham/OneDrive/Desktop/coding/jgrbhjrbkhn/TPW/promo_event/src/App.tsx)
- **L652-666** (`audioCacheRef useEffect`): Remove the entire preload block for `chime.wav`, `success.mp3`, `tick.mp3`
- **L713**: Remove `playSoundSafe("success", { volume: 1.0 })` from the level-up detector
- **L803-808**: Remove the `playSoundSafe(soundKey)` call inside `gainXPInternal` for `type === "mini"`
- **L811-814**: Remove `playSoundSafe("chime")` for `type === "level"`
- **L817-820**: Remove `playSoundSafe("success")` for `type === "lesson"`
- **L829-838**: Remove `playSoundSafe("chime")` from the profile screen navigation effect
- **L469**: In `playSparkles()`, remove the `playSoundSafe(opts.sound)` line (keep the debug log)

#### [MODIFY] [`DashboardCastleWorld.tsx`](file:///c:/Users/isham/OneDrive/Desktop/coding/jgrbhjrbkhn/TPW/promo_event/src/components/dashboard/DashboardCastleWorld.tsx)
- **L102-107**: Remove the `playVictoryBeat` function entirely (it's dead code — never called, but cleaning it avoids accidental future use)

---

## Priority 3 — Remove "Brilliant Move" & Bouncing Toasts

### What's being removed
- The **"Brilliant Move!"** purple pill toast at the top (triggered randomly 30% of the time after any move — completely fake, not based on chess quality)
- The **bottom bouncing purple banner** (the `boosterToast`) that shows "Puzzle Restarted!", "Last move undone!", "Hint: Look at the glowing piece."

> [!NOTE]
> The win sounds in `PostGameAnalysis.tsx` are NOT touched. Only the mid-game toasts are removed.

#### [MODIFY] [`page.tsx`](file:///c:/Users/isham/OneDrive/Desktop/coding/jgrbhjrbkhn/TPW/promo_event/app/public/tactile-chess/page.tsx)
- Remove `brilliantMoveToast` state (L33) and all references
- Remove the random trigger in `handleValidMove` (L109-112: `if (Math.random() > 0.7) ...`)
- Remove the brilliant move toast JSX (L126-130)
- Remove `boosterToast` state (L38) and all `setBoosterToast(...)` calls — replaced in Priority 4 below
- Remove the `boosterToast` bouncing banner JSX (L159-163)

---

## Priority 4 — Move Hint Feedback Off the Board

### Current Behaviour
Hint click → `setBoosterToast('Hint: Look at the glowing piece.')` → purple bouncing banner overlays the bottom of the board. This is distracting and blocks the board.

### New Behaviour
Add a `sidebarMessage` state. When the Hint/Undo/Restart buttons are clicked, a small non-intrusive message appears **inside the left sidebar** below the buttons (desktop), or as a small non-blocking pill in the **top-right corner** (mobile — nowhere near the board).

#### [MODIFY] [`page.tsx`](file:///c:/Users/isham/OneDrive/Desktop/coding/jgrbhjrbkhn/TPW/promo_event/app/public/tactile-chess/page.tsx)
- Replace `boosterToast` state with `sidebarMessage: string | null`
- Replace all `setBoosterToast(text)` with `setSidebarMessage(text)` + auto-clear after 3s
- Add a small message box **inside the sidebar** (`<nav>` block, below the Undo button) that shows `sidebarMessage` — styled as a subtle grey/blue info box, not a bouncing banner
- On **mobile** (where the `<nav>` is hidden): add a small fixed pill at `top-20 right-4` (top-right, well above the board) that shows the message and fades out

#### [MODIFY] [`SmartHints.tsx`](file:///c:/Users/isham/OneDrive/Desktop/coding/jgrbhjrbkhn/TPW/promo_event/components/tactile-chess/SmartHints.tsx)
- No change needed — the "Stuck?" inactivity popup already appears above the Hint button inside the sidebar correctly

---

## Priority 5 — Fix Board Shifting Down

### Root Cause
In [`ChessLevelGame.tsx`](file:///c:/Users/isham/OneDrive/Desktop/coding/jgrbhjrbkhn/TPW/promo_event/components/tactile-chess/ChessLevelGame.tsx), the objective header renders extra `mt-4` content when `status === 'success'` or `status === 'failed'`:

```tsx
{status === 'success' && (
  <div className="mt-4 text-emerald-500 font-bold animate-bounce">Level Complete!</div>
)}
```
This adds vertical space **inside the header card**, which pushes the `<ChessBoard>` below it down — even mid-animation. Since `PostGameAnalysis` already handles the "completed" state as a full-screen overlay 1.5s after completion, these inline status messages are actually redundant.

### Fix

#### [MODIFY] [`ChessLevelGame.tsx`](file:///c:/Users/isham/OneDrive/Desktop/coding/jgrbhjrbkhn/TPW/promo_event/components/tactile-chess/ChessLevelGame.tsx)
- **Remove** the `status === 'success'` and `status === 'failed'` status indicator divs (lines 245-254) entirely — `PostGameAnalysis` already handles win; `hasFailed` overlay already handles fail
- Add `min-h-[76px]` to the objective header container div so its height never changes regardless of content

---

## Verification Plan

1. **Supabase fix**: Complete a chess level → check `rewards` and `tactile_level_progress` tables in Supabase dashboard — both should have a new row with correct `student_id`
2. **Next level**: After completing a scenario, clicking "Next Level" in `PostGameAnalysis` should load the next puzzle seamlessly
3. **Home tab sounds**: Open home, click buttons, navigate to profile → silence throughout
4. **Chess sounds untouched**: Move pieces → move/capture sounds still work
5. **Win sounds untouched**: Complete a level → `PostGameAnalysis` sparkle/success sounds still play
6. **No board shift**: Complete a level → board stays in place, `PostGameAnalysis` overlay appears smoothly on top
7. **Hint in sidebar**: Click Hint → text appears in sidebar area, not over the board
8. **No alert()**: Force a scenario where auth might be stale — should fail silently with console error, not a browser `alert()`
