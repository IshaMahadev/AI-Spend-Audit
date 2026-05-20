import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/supabase";
import { CURRENT_PRICING } from "@/lib/pricing";
import { runAudit } from "@/lib/audit";
import { generateUnsubToken } from "@/lib/unsubToken";
import { Resend } from "resend";
import type { AuditResult, ToolRecommendation } from "@/types";
import type { UserInputData } from "@/lib/types";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL ?? "Auditly <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ai-spend-audit.vercel.app";

export async function POST(req: NextRequest) {
  try {
    const audits = await prisma.audit.findMany({
      where: { reauditParentId: null }, // only original audits
    });

    const unsubscribed = new Set(
      (await prisma.unsubscribe.findMany({ select: { email: true } })).map((u) => u.email)
    );

    const affectedAuditsByUser: Record<
      string,
      { auditId: string; diffs: string[]; recChanges: string[] }[]
    > = {};
    const allNewChanges: { tool: string; plan: string; oldPrice: number; newPrice: number }[] = [];
    let affectedCount = 0;

    for (const audit of audits) {
      const snapshot = audit.pricingSnapshot as any;
      if (!snapshot) continue;

      // ── 1. Price-level diff ──────────────────────────────────────────────
      const priceDiffs: string[] = [];
      const checks: [string, string, number | undefined, number | undefined][] = [
        ["Cursor",         "Pro",         snapshot.cursor?.pro,         CURRENT_PRICING.cursor.pro],
        ["Cursor",         "Business",    snapshot.cursor?.business,    CURRENT_PRICING.cursor.business],
        ["Claude",         "Pro",         snapshot.claude?.pro,         CURRENT_PRICING.claude.pro],
        ["Claude",         "Team",        snapshot.claude?.team,        CURRENT_PRICING.claude.team],
        ["GitHub Copilot", "Individual",  snapshot.copilot?.individual, CURRENT_PRICING.copilot.individual],
        ["GitHub Copilot", "Business",    snapshot.copilot?.business,   CURRENT_PRICING.copilot.business],
        ["GitHub Copilot", "Enterprise",  snapshot.copilot?.enterprise, CURRENT_PRICING.copilot.enterprise],
        ["ChatGPT",        "Plus",        snapshot.chatgpt?.plus,       CURRENT_PRICING.chatgpt.plus],
        ["ChatGPT",        "Team",        snapshot.chatgpt?.team,       CURRENT_PRICING.chatgpt.team],
      ];

      for (const [tool, plan, oldPrice, newPrice] of checks) {
        if (oldPrice !== undefined && newPrice !== undefined && oldPrice !== newPrice) {
          priceDiffs.push(`${tool} ${plan}: $${oldPrice}/mo → $${newPrice}/mo`);
          allNewChanges.push({ tool, plan, oldPrice, newPrice });
        }
      }

      if (priceDiffs.length === 0) continue;

      // ── 2. Recommendation diff (old pricing vs new pricing) ───────────────
      const inputStack = audit.inputStack as unknown as UserInputData;
      const originalResult = audit.outputResult as unknown as AuditResult;
      const newResult = runAudit(inputStack, CURRENT_PRICING);

      const recChanges: string[] = [];
      const origRecs = (originalResult.recommendations ?? []) as ToolRecommendation[];
      const newRecs = (newResult.recommendations ?? []) as ToolRecommendation[];

      for (const origRec of origRecs) {
        const newRec = newRecs.find((r) => r.toolName === origRec.toolName);
        if (!newRec) continue;
        if (origRec.recommendedAction !== newRec.recommendedAction) {
          recChanges.push(
            `${origRec.toolName}: was "${origRec.recommendedAction}" → now "${newRec.recommendedAction}"`
          );
        } else if (origRec.monthlySavings !== newRec.monthlySavings) {
          const delta = newRec.monthlySavings - origRec.monthlySavings;
          const sign = delta > 0 ? "+" : "";
          recChanges.push(
            `${origRec.toolName}: same action but savings changed ${sign}$${delta}/mo (was $${origRec.monthlySavings} → now $${newRec.monthlySavings})`
          );
        }
      }

      affectedCount++;
      if (!affectedAuditsByUser[audit.userEmail]) {
        affectedAuditsByUser[audit.userEmail] = [];
      }
      affectedAuditsByUser[audit.userEmail].push({
        auditId: audit.id,
        diffs: priceDiffs,
        recChanges,
      });
    }

    // ── 3. Log unique pricing changes ─────────────────────────────────────
    for (const change of allNewChanges) {
      const recent = await prisma.pricingChangeLog.findFirst({
        where: { tool: change.tool, plan: change.plan, newPrice: change.newPrice },
        orderBy: { detectedAt: "desc" },
      });
      if (!recent) {
        await prisma.pricingChangeLog.create({ data: change });
      }
    }

    // ── 4. Send emails ────────────────────────────────────────────────────
    let emailsSent = 0;

    for (const [email, userAudits] of Object.entries(affectedAuditsByUser)) {
      if (unsubscribed.has(email)) continue;

      const unsubUrl = `${APP_URL}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${generateUnsubToken(email)}`;
      const allPriceDiffs = Array.from(new Set(userAudits.flatMap((a) => a.diffs)));
      const allRecChanges = Array.from(new Set(userAudits.flatMap((a) => a.recChanges)));

      const lines: string[] = [
        `Hi there,`,
        ``,
        `AI tool pricing has changed since you ran your Auditly audit. Here's what moved:`,
        ``,
        `PRICE CHANGES`,
        ...allPriceDiffs.map((d) => `  • ${d}`),
      ];

      if (allRecChanges.length > 0) {
        lines.push(``);
        lines.push(`HOW THIS AFFECTS YOUR RECOMMENDATIONS`);
        lines.push(...allRecChanges.map((r) => `  • ${r}`));
      } else {
        lines.push(``);
        lines.push(`Your recommendations remain the same, but the savings amounts have updated.`);
      }

      lines.push(``);
      lines.push(`SEE YOUR UPDATED AUDIT${userAudits.length > 1 ? "S" : ""}`);
      for (const ua of userAudits) {
        lines.push(`  → ${APP_URL}/reaudit/${ua.auditId}`);
      }

      lines.push(``);
      lines.push(`Each link shows your original audit side-by-side with an updated analysis at today's prices.`);
      lines.push(``);
      lines.push(`— The Auditly Team`);
      lines.push(``);
      lines.push(`Unsubscribe: ${unsubUrl}`);

      // Log the send
      await Promise.all(
        userAudits.map((ua) =>
          prisma.emailLog.create({ data: { email, auditId: ua.auditId } })
        )
      );

      if (resend) {
        try {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: "Your AI audit recommendations have changed",
            text: lines.join("\n"),
          });
          emailsSent++;
        } catch (err) {
          console.error(`Email to ${email} failed:`, err);
        }
      } else {
        console.warn(`[detect-changes] No Resend key. Would send to ${email}:\n${lines.join("\n")}`);
      }
    }

    return NextResponse.json({ checked: audits.length, affected: affectedCount, emailsSent });
  } catch (err: any) {
    console.error("detect-changes error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
