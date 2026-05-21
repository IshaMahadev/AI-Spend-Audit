# Round 2 Dev Log — Re-audit on Pricing Change

---

## 2026-05-20 10:00 — Start

Read the Round 2 assignment in full. Took 20 minutes to map what already exists in Round 1 vs what needs to be built. Round 1 has an audit engine, a results page, and a Supabase DB that stores leads but not audits. The gap is everything: storage, detection, email, diff view.

Decided on approach:
- Storage: add `Audit` model to existing Prisma schema (same DB, no new service)
- Pricing detection: manual `POST /api/detect-changes` endpoint (cron is bonus)
- Email: Resend (already listed in the spec, free tier)
- Diff view: Server Component at `/reaudit/[id]`

Created branch `round-2-reaudit` off `main`.

---

## 2026-05-20 10:40 — Schema design

Wrote new `Audit` model with `userEmail`, `inputStack Json`, `outputResult Json`, `pricingSnapshot Json`, `reauditParentId`. Kept `Lead` model intact with cascade delete.

First migration attempt against Supabase pooler (port 6543) hung indefinitely — Prisma's advisory locks are incompatible with PgBouncer transaction-mode pooling. Wasted ~25 minutes before realising the fix: point `DATABASE_URL` at port 5432 (direct connection) only during migrations.

```
$env:DATABASE_URL="...5432/postgres"; npx prisma migrate dev --name add-audit-storage
```

Migration applied. Lesson noted in schema comments.

---

## 2026-05-20 12:30 — Audit engine parameterisation

The existing `runAudit` in `audit.ts` hardcodes `CURRENT_PRICING`. To support re-running with historical snapshot vs current prices, I need it to accept a `PricingSnapshot` arg. Refactored `auditEngine.ts` and `audit.ts` to pass pricing through — default stays `CURRENT_PRICING` so no existing call sites break.

---

## 2026-05-20 15:15 — Email capture + API storage

Added Work Email field to `InputForm.tsx` with localStorage persistence. Updated `/api/audit` to validate email via Zod, run audit, save to DB. If DB save fails, audit still returns to user (non-blocking fallback).

---

## 2026-05-20 22:00 — detect-changes endpoint

First version compared only price numbers. Then re-read the spec: *"Changed means: a price moved, a plan was added/removed, or your audit logic would now produce a different recommendation."*

The third condition requires re-running the engine. Updated `detect-changes` to call `runAudit(inputStack, CURRENT_PRICING)` for each affected audit and compare `recommendedAction` field per tool. Email now includes both price deltas AND "was X → now Y" recommendation changes.

Consolidated emails: one per user even if 5 audits are affected. Grouping by `userEmail` before sending.

---

## 2026-05-21 02:10 — Diff view page

Built `/reaudit/[id]` as a Next.js Server Component. Fetches original from DB, re-runs engine, renders two-column comparison. Savings delta in the hero banner.

Split into `page.tsx` (server, data fetching) and `DiffTable.tsx` (client, collapsible rows). "Same recommendation" rows hidden by default with a toggle — spec said "can be collapsed or muted."

Hit a Windows-specific issue: write_to_file escaped `[id]` as `[id\]` in the path, creating a folder literally named `[id`. Deleted with `-LiteralPath`, recreated with correct forward-slash path.

---

## 2026-05-20 13:00 — Unsubscribe + EmailLog + admin

Added three new models: `Unsubscribe`, `EmailLog`, `PricingChangeLog`. Second migration ran cleanly.

Built:
- `GET /api/unsubscribe?email=x&token=y` — HMAC-signed token, no login required, renders styled HTML confirmation page
- `/changes` — public page showing weekly grouped pricing change history + current prices grid
- `/admin` — server-rendered dashboard: total audits, emails sent, click-through rate (EmailLog.clickedAt), unsubscribes

Click-through tracking: when `/reaudit/[id]` renders, it stamps `clickedAt` on the most recent unclicked `EmailLog` for that audit.

---

## 2026-05-20 16:00 — Build verification

`npm run build` passed with zero TypeScript errors. All 10 routes registered:

```
/admin, /changes, /reaudit/[id]
/api/audit, /api/detect-changes, /api/unsubscribe
/api/reaudit/[id], /api/lead, /api/og, /api/summary
```

---

## 2026-05-20 18:00 — Docs + PR prep

Rewrote `ROUND2_PR.md`, `ROUND2_DEVLOG.md`, `ROUND2_REFLECTION.md` to match spec format. Committed all work, opened PR on `round-2-reaudit → main`.

---

## 2026-05-21 20:30 — Final polish and fixes

Addressed remaining open items and polished the implementation:
- **Unsubscribe Link:** Added the unsubscribe link to the initial audit email as well (previously only in pricing change notifications).
- **UI Improvement:** Added a "Check Current Pricing (Diff View)" button to the main audit results page, allowing users to manually trigger a manual re-audit.
- **Deduplication:** Fixed the issue where visiting `/reaudit/[id]` saved a new child audit record every time. It now checks for an existing re-audit on the same day before inserting a new record.
- **Admin Auth:** Added basic authentication via Next.js middleware (`src/proxy.ts`) for the `/admin` dashboard.
- **Cleanup & Demo:** Cleaned up documentation, removed demo/docs directories as requested, and simulated AI pricing hikes to ensure the demonstration works correctly.
