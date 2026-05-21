# feat: add re-audit on pricing change with email notifications

## What this PR does

This PR makes audits "live" — when AI tool pricing changes, stored audits are automatically flagged and affected users are emailed with a side-by-side diff of their original vs updated recommendations. Users can view the diff at `/reaudit/[id]`, opt out via a one-click unsubscribe link, and admins can monitor activity via `/admin`.

## Why

A one-time audit is only useful the day it's run. Cursor raised prices in 2024, Claude added new tiers in 2025 — any audit older than a few months is actively misleading. The assumption is that users who care enough to audit their stack also care when that audit goes stale. Proactive email notifications (rather than expecting them to return) is the only way to deliver ongoing value.

## How it works

```
User submits form
  → /api/audit saves Audit row (email, inputStack JSON, outputResult JSON, pricingSnapshot JSON)

Admin/cron triggers POST /api/detect-changes
  → Loads all Audit rows, compares pricingSnapshot vs CURRENT_PRICING (src/lib/pricing.ts)
  → Re-runs auditEngine with current pricing to detect recommendation changes
  → Groups affected audits by userEmail (one email per user, not per audit)
  → Sends email via Resend: lists price deltas + "was X → now Y" recommendation changes
  → Logs each send to EmailLog table
  → Skips users in Unsubscribe table

User clicks link in email
  → Lands on /reaudit/[id] (Server Component)
  → Fetches original audit from DB, re-runs engine with CURRENT_PRICING
  → Renders side-by-side: Original Audit | Updated Audit
  → Savings delta is the headline; rows are green (better) / red (worse)
  → Same-recommendation rows collapsed by default (toggle button)
  → EmailLog.clickedAt is stamped for click-through tracking

User clicks unsubscribe link in email
  → GET /api/unsubscribe?email=x&token=y (HMAC-signed, no login required)
  → Inserts into Unsubscribe table; renders styled confirmation page
```

**New files:**
- `src/lib/pricing.ts` — `CURRENT_PRICING` snapshot + `PricingSnapshot` type
- `src/lib/auditStorage.ts` — `saveAudit()` / `getAuditById()` helpers
- `src/lib/unsubToken.ts` — HMAC token generation + verification
- `src/app/api/detect-changes/route.ts` — pricing change detection + email dispatch
- `src/app/api/unsubscribe/route.ts` — one-click unsubscribe handler
- `src/app/api/reaudit/[id]/route.ts` — programmatic JSON diff endpoint
- `src/app/reaudit/[id]/page.tsx` — visual diff page (Server Component)
- `src/app/reaudit/[id]/DiffTable.tsx` — collapsible diff table (Client Component)
- `src/app/changes/page.tsx` — public pricing change history page
- `src/app/admin/page.tsx` — admin dashboard (audits, emails sent, click-through rate)

**Modified:**
- `prisma/schema.prisma` — added `Audit`, `Unsubscribe`, `EmailLog`, `PricingChangeLog` models
- `src/app/api/audit/route.ts` — saves every audit to DB with email + pricing snapshot
- `src/components/InputForm.tsx` — added required Work Email field with localStorage persistence
- `src/lib/auditEngine.ts` / `src/lib/audit.ts` — parameterized to accept `PricingSnapshot`

## What I cut

- **Scheduled cron trigger**: The spec says manual `/api/detect-changes` is acceptable. Given the 36-hour window, I chose to ship the manual endpoint first and document the cron setup path rather than risk a broken Vercel Cron integration eating time.
- **HTML email template**: Plain text emails were faster to ship and avoid Resend's HTML rendering quirks. The content is complete; the styling is not.

## How to test it manually

1. Go to the live URL and submit an audit with a real email address and at least one Cursor Pro subscription
2. Note the audit ID in the URL (`/audit/aud_xxx`)
3. Temporarily bump `cursor.pro` from `20` to `25` in `src/lib/pricing.ts` (already done on this branch)
4. Trigger detection: `POST /api/detect-changes` (use Postman or `curl -X POST https://<url>/api/detect-changes`)
5. Check your inbox — email should arrive within 30 seconds from `onboarding@resend.dev`
6. Email contains: price delta (`Cursor Pro: $20/mo → $25/mo`) + recommendation change if applicable
7. Click the re-audit link in the email → lands on `/reaudit/[id]` showing side-by-side diff
8. Savings delta shows in the headline banner
9. Click "Unsubscribe" link at bottom of email → confirmation page renders
10. Trigger `/api/detect-changes` again → that email address is skipped
11. Check `/admin` for updated totals and click-through status

## What's tested

- `npm run build` passes with zero TypeScript errors across all new routes
- Prisma migration applied cleanly to Supabase (direct port 5432 required, not PgBouncer)
- `/api/detect-changes` returns `{ checked, affected, emailsSent }` — verified locally
- `/reaudit/[id]` renders correctly for an existing audit ID
- Unsubscribe token is verified — invalid tokens return 403

Skipped due to time: unit tests for `auditEngine` with custom pricing snapshot, and integration tests for the email flow. First tests I'd write: assert that re-running `runAudit` with a higher `cursor.pro` value changes the `recommendedAction` for a Cursor Pro user at the breakeven threshold.

## Open questions / risks

- **Email deliverability**: Using Resend's shared `onboarding@resend.dev` sender without a verified custom domain. In production this will land in spam for most providers. Fix: verify a custom domain on Resend before launch.
