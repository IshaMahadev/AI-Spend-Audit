# Round 2 Reflection

## 1. What was the most uncomfortable trade-off you made because of the time pressure?

Skipping a verified custom email domain. The spec requires that notifications reach users — but Resend's shared sender (`onboarding@resend.dev`) will land in spam for most inboxes. The correct fix (verify a custom domain, update DNS, redeploy) is 30 minutes of work, but it's 30 minutes I couldn't guarantee wouldn't turn into 3 hours if DNS propagation was slow or the domain provider had issues. So I shipped the email logic in full — the content, the consolidation, the unsubscribe link, the recommendation diff — with a sender that technically works but practically underperforms. The trade-off was correctness of implementation vs reliability of delivery. I chose correctness and documented the gap.

## 2. If we extended the deadline by another 24 hours, the single first thing I'd do:

Verify a custom domain on Resend. Not because it's the hardest problem — it isn't — but because it's the one thing that makes the entire email feature real rather than theoretical. Everything else (admin auth, re-audit deduplication, cron scheduling) builds on whether the email actually reaches users. Until that's solved, the feature works in demos and fails in production. That's the first thing.

## 3. One thing Round 1 self made harder for Round 2 self:

The audit engine in Round 1 hardcoded pricing constants inline inside `auditEngine.ts` rather than accepting them as a parameter. This meant Round 2's core requirement — "re-run the audit with current pricing and compare it to the original" — required refactoring the engine signature before anything else could be built. It wasn't a big refactor, but it was an unplanned one at midnight. If Round 1 had treated pricing as an injected dependency from the start (even just as a default argument), the parameterisation in Round 2 would have been zero work instead of 45 minutes of careful threading through `auditEngine.ts → audit.ts → every call site`.
