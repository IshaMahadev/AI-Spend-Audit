import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/supabase";
import { runAudit } from "@/lib/audit";
import { CURRENT_PRICING } from "@/lib/pricing";
import { saveAudit } from "@/lib/auditStorage";
import DiffTable from "./DiffTable";
import type { AuditResult, ToolRecommendation } from "@/types";
import type { UserInputData } from "@/lib/types";

interface ReauditPageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function ReauditPage({ params }: ReauditPageProps) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const originalAudit = await prisma.audit.findUnique({ where: { id } });
  if (!originalAudit) return notFound();

  // Track email click-through — mark the most recent unclicked EmailLog for this audit
  try {
    const unclicked = await prisma.emailLog.findFirst({
      where: { auditId: id, clickedAt: null },
      orderBy: { sentAt: "desc" },
    });
    if (unclicked) {
      await prisma.emailLog.update({
        where: { id: unclicked.id },
        data: { clickedAt: new Date() },
      });
    }
  } catch (err) {
    // Non-critical — don't break the page if tracking fails
    console.error("Click tracking failed:", err);
  }

  const originalResult = originalAudit.outputResult as unknown as AuditResult;
  const inputStack = originalAudit.inputStack as unknown as UserInputData;

  // Run audit with current pricing snapshot
  const newAuditResult = runAudit(inputStack, CURRENT_PRICING);

  // Check if a child reaudit for this visit was already logged or just log it
  try {
    await saveAudit(
      originalAudit.userEmail,
      inputStack,
      newAuditResult,
      originalAudit.id
    );
  } catch (err) {
    console.error("Failed to save re-audit record:", err);
  }

  // Calculate comparisons
  const origSavings = originalResult.totalMonthlySavings;
  const newSavings = newAuditResult.totalMonthlySavings;
  const savingsDelta = newSavings - origSavings;

  const originalRecs = (originalResult.recommendations || []) as ToolRecommendation[];
  const newRecs = (newAuditResult.recommendations || []) as ToolRecommendation[];

  // Gather all unique tools analyzed
  const tools = Array.from(
    new Set([
      ...originalRecs.map((r) => r.toolName),
      ...newRecs.map((r) => r.toolName),
    ])
  );

  const comparisons = tools.map((toolName) => {
    const orig = originalRecs.find((r) => r.toolName === toolName);
    const updated = newRecs.find((r) => r.toolName === toolName);

    const origSavingsVal = orig ? orig.monthlySavings : 0;
    const updatedSavingsVal = updated ? updated.monthlySavings : 0;

    let status: "better" | "worse" | "same" = "same";
    if (updatedSavingsVal > origSavingsVal) {
      status = "better";
    } else if (updatedSavingsVal < origSavingsVal) {
      status = "worse";
    }

    return {
      toolName,
      orig,
      updated,
      status,
      origSavingsVal,
      updatedSavingsVal,
    };
  });

  const formattedOriginalDate = new Date(originalAudit.createdAt).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  return (
    <div className="min-h-screen bg-paper text-ink pb-20">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-paper/90 backdrop-blur-md border-b border-ink/8">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-ink rounded-lg flex items-center justify-center">
              <span className="text-acid text-xs font-display font-800">A</span>
            </div>
            <span className="font-display font-700 text-ink text-sm tracking-tight">
              auditly
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/" className="btn-secondary text-xs py-1.5 px-4">
              New Audit
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        {/* Banner with delta */}
        <div className="card-dark p-8 noise relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background:
                "radial-gradient(ellipse 60% 60% at 80% 40%, #C8FF00 0%, transparent 70%)",
            }}
            aria-hidden
          />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="font-mono text-xs text-acid uppercase tracking-widest mb-1">
                Re-Audit Comparison
              </p>
              <h1 className="font-display font-800 text-3xl md:text-5xl text-paper leading-none">
                AI Pricing Changes Detected
              </h1>
              <p className="font-body text-paper/60 text-sm mt-2 max-w-xl">
                We re-evaluated your stack inputs against the latest AI tool prices. 
                Below is the side-by-side comparison of your original audit and today's updated analysis.
              </p>
            </div>
            
            <div className="p-4 bg-paper/5 border border-paper/10 rounded-lg flex-shrink-0 text-center min-w-[200px]">
              <p className="font-mono text-xs text-paper/40 uppercase">Savings Delta</p>
              {savingsDelta > 0 ? (
                <>
                  <p className="font-display font-800 text-3xl text-acid mt-1">
                    +${savingsDelta.toLocaleString()}
                    <span className="text-xs font-400">/mo</span>
                  </p>
                  <span className="tag-green text-2xs mt-1 inline-block">More savings found!</span>
                </>
              ) : savingsDelta < 0 ? (
                <>
                  <p className="font-display font-800 text-3xl text-coral mt-1">
                    -${Math.abs(savingsDelta).toLocaleString()}
                    <span className="text-xs font-400">/mo</span>
                  </p>
                  <span className="tag-red text-2xs mt-1 inline-block">Savings potential decreased</span>
                </>
              ) : (
                <>
                  <p className="font-display font-800 text-3xl text-paper mt-1">
                    $0
                    <span className="text-xs font-400">/mo</span>
                  </p>
                  <span className="tag text-2xs mt-1 inline-block">No change in total savings</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Side-by-Side Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Original Card */}
          <div className="card p-6 border-ink/8 space-y-4">
            <div className="flex items-center justify-between border-b border-ink/8 pb-3">
              <span className="font-mono text-xs uppercase text-ink/40">Original Audit</span>
              <span className="tag">{formattedOriginalDate}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-mono text-2xs uppercase text-ink/40">Total Spend</p>
                <p className="font-display font-800 text-2xl text-ink mt-0.5">
                  ${originalResult.totalMonthlySpend.toLocaleString()}
                  <span className="text-xs text-ink/40 font-400">/mo</span>
                </p>
              </div>
              <div>
                <p className="font-mono text-2xs uppercase text-ink/40">Total Savings</p>
                <p className="font-display font-800 text-2xl text-ink mt-0.5">
                  ${originalResult.totalMonthlySavings.toLocaleString()}
                  <span className="text-xs text-ink/40 font-400">/mo</span>
                </p>
              </div>
            </div>
          </div>

          {/* New Card */}
          <div className="card p-6 border-ink/8 space-y-4 bg-paper-warm/30">
            <div className="flex items-center justify-between border-b border-ink/8 pb-3">
              <span className="font-mono text-xs uppercase text-ink/40">Updated Audit</span>
              <span className="tag-green">Today (Current Prices)</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-mono text-2xs uppercase text-ink/40">Total Spend</p>
                <p className="font-display font-800 text-2xl text-ink mt-0.5">
                  ${newAuditResult.totalMonthlySpend.toLocaleString()}
                  <span className="text-xs text-ink/40 font-400">/mo</span>
                </p>
              </div>
              <div>
                <p className="font-mono text-2xs uppercase text-ink/40">Total Savings</p>
                <p className="font-display font-800 text-2xl text-ink mt-0.5">
                  ${newAuditResult.totalMonthlySavings.toLocaleString()}
                  <span className="text-xs text-ink/40 font-400">/mo</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="space-y-4">
          <h2 className="font-display font-700 text-lg text-ink">
            Recommendation Differential
          </h2>
          <DiffTable comparisons={comparisons} />
        </div>

        {/* Back Link */}
        <div className="pt-4 flex justify-center">
          <Link
            href="/"
            className="btn-secondary font-display font-700 text-sm text-center"
          >
            ← Back to Homepage
          </Link>
        </div>
      </main>
    </div>
  );
}
