/**
 * Audit adapter — wraps the core auditEngine and produces the
 * enriched AuditResult type that API routes and the results page expect.
 */

import { runAudit as runEngine } from "./auditEngine";
import type { UserInputData } from "./types";
import type { AuditResult, ToolRecommendation } from "@/types";
import { CURRENT_PRICING, PricingSnapshot } from "./pricing";

/** Industry average AI spend per developer per month (USD). */
const INDUSTRY_AVG_PER_DEV = 45;

function generateId(): string {
  return `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function mapRecommendation(action: string): string {
  if (action.startsWith("Downgrade")) return "downgrade_plan";
  if (action.startsWith("Switch")) return "switch_tool";
  if (action.includes("Credex")) return "buy_credits";
  if (action.startsWith("Evaluate")) return "switch_tool";
  if (action.includes("Reduce")) return "reduce_seats";
  return "already_optimal";
}

export function runAudit(input: UserInputData, pricing: PricingSnapshot = CURRENT_PRICING): AuditResult {
  const engineResult = runEngine(input, pricing);

  const totalMonthlySpend = Number(input.subscriptions.reduce(
    (sum, s) => sum + s.spend,
    0
  ).toFixed(2));
  const spendPerDeveloper =
    input.teamSize > 0
      ? Math.round(totalMonthlySpend / input.teamSize)
      : 0;

  const recommendations: ToolRecommendation[] = engineResult.results.map(
    (r) => ({
      toolId: r.subscription.toolName.toLowerCase().replace(/\s+/g, "_"),
      toolName: r.subscription.toolName,
      currentPlan: r.subscription.plan,
      currentSeats: r.subscription.seats,
      currentSpend: r.subscription.spend,
      recommendation: mapRecommendation(r.recommendedAction),
      recommendedAction: r.recommendedAction,
      monthlySavings: r.monthlySavings,
      reasoning: r.reason,
      credexOpportunity:
        r.recommendedAction === "Procure via Credex Credits" ||
        r.monthlySavings > 100,
    })
  );

  return {
    id: generateId(),
    createdAt: new Date().toISOString(),
    totalMonthlySavings: engineResult.totalMonthlySavings,
    totalMonthlySpend,
    totalAnnualSavings: engineResult.totalAnnualSavings,
    teamSize: input.teamSize,
    useCase: input.primaryUseCase,
    spendPerDeveloper,
    industryAvgPerDeveloper: INDUSTRY_AVG_PER_DEV,
    recommendations,
    isOptimal: engineResult.isOptimal,
  };
}
