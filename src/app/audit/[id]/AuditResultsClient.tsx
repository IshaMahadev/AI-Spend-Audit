"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { AuditResult, ToolRecommendation } from "@/types";

const RECOMMENDATION_LABELS: Record<string, { label: string; color: string }> = {
  downgrade_plan: { label: "Downgrade plan", color: "tag-red" },
  switch_tool: { label: "Switch tool", color: "tag-red" },
  buy_credits: { label: "Buy discounted credits", color: "tag-green" },
  already_optimal: { label: "Already optimal ✓", color: "tag" },
  reduce_seats: { label: "Reduce seats", color: "tag-red" },
};

function AnimatedNumber({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 800;
    const from = 0;
    const to = value;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplayed(Math.round(from + (to - from) * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value]);

  return <>{displayed.toLocaleString()}</>;
}

function RecommendationCard({
  rec,
  index,
}: {
  rec: ToolRecommendation;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const style = RECOMMENDATION_LABELS[rec.recommendation] ?? {
    label: rec.recommendation,
    color: "tag",
  };

  return (
    <div
      className="card p-5 animate-fade-up"
      style={{ animationDelay: `${index * 75}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-display font-700 text-sm text-ink">
            {rec.toolName}
          </p>
          <p className="font-body text-xs text-ink/40 mt-0.5">
            {rec.currentSeats} seat{rec.currentSeats > 1 ? "s" : ""} ·{" "}
            {rec.currentPlan}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {rec.monthlySavings > 0 && (
            <span className="font-display font-700 text-sm text-ink">
              −${rec.monthlySavings.toLocaleString()}/mo
            </span>
          )}
          <span className={style.color}>{style.label}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 py-2.5 px-3 bg-paper-warm rounded-lg mb-3">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className="flex-shrink-0 text-ink/60"
        >
          <path
            d="M7 1v12M1 7h12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <p className="font-body text-sm text-ink font-500">
          {rec.recommendedAction}
        </p>
      </div>

      {/* Expandable reasoning */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-body text-ink/40 hover:text-ink/70 transition-colors"
        aria-expanded={expanded}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
        >
          <path
            d="M4 2l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Why this recommendation
      </button>

      {expanded && (
        <p className="mt-2 font-body text-xs text-ink/60 leading-relaxed pl-4 border-l-2 border-acid/40">
          {rec.reasoning}
        </p>
      )}

      {rec.credexOpportunity && (
        <div className="mt-3 pt-3 border-t border-ink/8">
          <p className="font-body text-xs text-ink/50">
            Credex can help you capture this saving with discounted credits
          </p>
        </div>
      )}
    </div>
  );
}

function LeadCapture({
  auditId,
  hasSavings,
}: {
  auditId: string;
  hasSavings: boolean;
}) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [honeypot, setHoneypot] = useState(""); // bot trap
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditId,
          email,
          companyName: company || undefined,
          role: role || undefined,
          website: honeypot, // honeypot
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to save");
      }

      setSubmitted(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="card p-6 text-center">
        <div className="w-10 h-10 bg-acid rounded-full flex items-center justify-center mx-auto mb-3">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M3.5 9l4 4 7-7"
              stroke="#0A0A0F"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="font-display font-700 text-sm text-ink">Report sent!</p>
        <p className="font-body text-xs text-ink/50 mt-1">
          Check your inbox for the full audit.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6" id="email-capture">
      <p className="font-display font-700 text-base text-ink mb-1">
        {hasSavings
          ? "Get this report emailed to you"
          : "Stay updated on new optimisations"}
      </p>
      <p className="font-body text-xs text-ink/50 mb-4">
        {hasSavings
          ? "We'll also flag when new savings opportunities apply to your stack."
          : "We'll notify you when cheaper alternatives match your exact stack."}
      </p>
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        {/* Honeypot — hidden from real users */}
        <input
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          aria-hidden="true"
          tabIndex={-1}
          className="hidden"
          autoComplete="off"
        />
        <div>
          <label className="label" htmlFor="email-input">
            Work email
          </label>
          <input
            id="email-input"
            type="email"
            className="input"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="company-input">
              Company{" "}
              <span className="normal-case font-body font-400 tracking-normal text-ink/30">
                (opt)
              </span>
            </label>
            <input
              id="company-input"
              type="text"
              className="input"
              placeholder="Acme"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              autoComplete="organization"
            />
          </div>
          <div>
            <label className="label" htmlFor="role-input">
              Role{" "}
              <span className="normal-case font-body font-400 tracking-normal text-ink/30">
                (opt)
              </span>
            </label>
            <input
              id="role-input"
              type="text"
              className="input"
              placeholder="CTO"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
        </div>
        {err && (
          <p className="font-body text-xs text-coral">{err}</p>
        )}
        <button
          type="submit"
          disabled={loading || !email}
          className="w-full py-3 bg-ink text-paper font-display font-700 text-sm rounded-lg
                     hover:bg-ink/90 transition-all duration-150
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Sending…" : "Email me the report"}
        </button>
        <p className="font-body text-xs text-ink/30 text-center">
          No spam. Unsubscribe any time.
        </p>
      </form>
    </div>
  );
}

export default function AuditResultsClient({ audit }: { audit: AuditResult }) {
  const [summary, setSummary] = useState<string | null>(audit.aiSummary ?? null);
  const [summaryLoading, setSummaryLoading] = useState(!audit.aiSummary);
  const [copied, setCopied] = useState(false);

  const APP_URL =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "";
  const shareUrl = `${APP_URL}/audit/${audit.id}`;

  useEffect(() => {
    if (audit.aiSummary) return;
    setSummaryLoading(true);

    fetch("/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auditId: audit.id,
        totalMonthlySavings: audit.totalMonthlySavings,
        totalMonthlySpend: audit.totalMonthlySpend,
        useCase: audit.useCase,
        teamSize: audit.teamSize,
        recommendations: audit.recommendations.map((r: ToolRecommendation) => ({
          toolName: r.toolName,
          recommendation: r.recommendation,
          monthlySavings: r.monthlySavings,
          reasoning: r.reasoning,
        })),
      }),
    })
      .then((r: Response) => r.json())
      .then((d: { summary?: string }) => {
        if (d.summary) setSummary(d.summary);
      })
      .catch(console.error)
      .finally(() => setSummaryLoading(false));
  }, [audit]);

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const hasBigSavings = audit.totalMonthlySavings > 500;
  const hasSmallSavings =
    audit.totalMonthlySavings > 0 && audit.totalMonthlySavings <= 100;
  const isOptimal =
    audit.totalMonthlySavings === 0 ||
    audit.recommendations.every((r) => r.recommendation === "already_optimal");

  const actionItems = audit.recommendations.filter(
    (r) => r.recommendation !== "already_optimal"
  );

  return (
    <div className="min-h-screen bg-paper">
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
            <button
              type="button"
              onClick={copyLink}
              className="btn-ghost text-xs"
              aria-label="Copy share link"
            >
              {copied ? (
                "✓ Copied"
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect
                      x="4"
                      y="4"
                      width="8"
                      height="8"
                      rx="1.5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M2 10V3a1 1 0 011-1h7"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Share
                </>
              )}
            </button>
            <Link href="/" className="btn-secondary text-xs py-1.5 px-4">
              New Audit
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Hero savings */}
        <div className="card-dark p-8 mb-8 noise relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background:
                "radial-gradient(ellipse 60% 60% at 80% 40%, #C8FF00 0%, transparent 70%)",
            }}
            aria-hidden
          />
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div>
                <p className="font-mono text-xs text-paper/40 uppercase tracking-widest mb-3">
                  Audit results · {audit.teamSize} people · {audit.useCase}
                </p>
                {isOptimal ? (
                  <>
                    <p className="font-display font-800 text-4xl sm:text-5xl text-paper leading-none mb-2">
                      You're spending well.
                    </p>
                    <p className="font-body text-paper/60 text-base">
                      Your AI stack looks well-matched to your team size and use case.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-mono text-xs text-acid uppercase tracking-widest mb-1">
                      Potential monthly savings
                    </p>
                    <p className="font-display font-800 text-5xl sm:text-6xl text-paper leading-none">
                      $<AnimatedNumber value={audit.totalMonthlySavings} />
                      <span className="text-paper/40 text-2xl font-400">/mo</span>
                    </p>
                    <p className="font-body text-paper/50 text-sm mt-2">
                      = $
                      <AnimatedNumber value={audit.totalAnnualSavings} /> per
                      year · on a $
                      <AnimatedNumber value={audit.totalMonthlySpend} />/mo
                      stack
                    </p>
                  </>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <div className="flex gap-3">
                  <div className="text-center">
                    <p className="font-display font-700 text-xl text-paper">
                      {audit.recommendations.length}
                    </p>
                    <p className="font-mono text-xs text-paper/40">
                      tools audited
                    </p>
                  </div>
                  <div className="w-px bg-paper/10" aria-hidden />
                  <div className="text-center">
                    <p className="font-display font-700 text-xl text-paper">
                      {actionItems.length}
                    </p>
                    <p className="font-mono text-xs text-paper/40">actions</p>
                  </div>
                  <div className="w-px bg-paper/10" aria-hidden />
                  <div className="text-center">
                    <p className="font-display font-700 text-xl text-paper">
                      ${audit.spendPerDeveloper}
                    </p>
                    <p className="font-mono text-xs text-paper/40">
                      per dev/mo
                    </p>
                  </div>
                </div>
                {audit.spendPerDeveloper > audit.industryAvgPerDeveloper && (
                  <p className="font-mono text-xs text-acid">
                    ↑ {Math.round((audit.spendPerDeveloper / audit.industryAvgPerDeveloper - 1) * 100)}% above industry avg (${audit.industryAvgPerDeveloper}/dev)
                  </p>
                )}
              </div>
            </div>

            {/* Share strip */}
            <div className="mt-6 pt-6 border-t border-paper/10 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center gap-2 px-4 py-2 bg-paper/10 hover:bg-paper/20 text-paper rounded-lg text-xs font-body transition-colors"
              >
                {copied ? "✓ Link copied!" : "Copy share link"}
              </button>
              <a
                href={`https://twitter.com/intent/tweet?text=I+just+audited+my+team%27s+AI+spend+with+%40auditly_dev+—+found+%24${audit.totalMonthlySavings}%2Fmo+in+savings.+Free+tool%3A&url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-paper/10 hover:bg-paper/20 text-paper rounded-lg text-xs font-body transition-colors"
              >
                𝕏 Share on Twitter
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: recommendations */}
          <div className="lg:col-span-2 space-y-4">
            {/* AI Summary */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 bg-ink/8 rounded-md flex items-center justify-center">
                  <span className="text-xs">✦</span>
                </div>
                <p className="font-display font-700 text-sm text-ink">
                  Personalised Summary
                </p>
              </div>
              {summaryLoading ? (
                <div className="space-y-2">
                  <div className="shimmer h-4 rounded w-full" />
                  <div className="shimmer h-4 rounded w-11/12" />
                  <div className="shimmer h-4 rounded w-4/5" />
                </div>
              ) : summary ? (
                <p className="font-body text-sm text-ink/70 leading-relaxed">
                  {summary}
                </p>
              ) : null}
            </div>

            {/* Per-tool recommendations */}
            <h2 className="font-display font-700 text-base text-ink px-1">
              Per-tool breakdown
            </h2>
            {audit.recommendations.map((rec: ToolRecommendation, i: number) => (
              <RecommendationCard key={rec.toolId} rec={rec} index={i} />
            ))}

            {/* Credex CTA for high savings */}
            {hasBigSavings && (
              <div
                className="card-dark p-6 noise"
                id="credex"
                role="complementary"
                aria-label="Credex savings offer"
              >
                <p className="font-mono text-xs text-acid uppercase tracking-widest mb-2">
                  High savings detected
                </p>
                <p className="font-display font-700 text-xl text-paper mb-2">
                  Capture that $
                  {audit.totalMonthlySavings.toLocaleString()}/mo with Credex
                </p>
                <p className="font-body text-sm text-paper/60 mb-4 leading-relaxed">
                  Credex sells discounted AI infrastructure credits — Cursor,
                  Claude, ChatGPT Enterprise, and more — sourced from companies
                  that over-forecasted. Same tokens, lower price. Typically
                  15–30% below retail.
                </p>
                <a
                  href="https://credex.rocks?ref=auditly"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-acid text-ink font-display font-700 text-sm rounded-lg hover:bg-acid-dim transition-colors"
                >
                  Book a Credex consult →
                </a>
              </div>
            )}

            {/* Already optimal / small savings messaging */}
            {(isOptimal || hasSmallSavings) && (
              <div className="card p-6 border-acid/30">
                <p className="font-display font-700 text-sm text-ink mb-1">
                  {isOptimal
                    ? "You're spending well."
                    : "Minor optimisations only."}
                </p>
                <p className="font-body text-sm text-ink/60 leading-relaxed">
                  Your current AI tooling matches your team size and use case
                  well. Stay subscribed — we'll flag you when better options
                  emerge for your stack.
                </p>
              </div>
            )}
          </div>

          {/* Right: lead capture + metadata */}
          <div className="space-y-4">
            <LeadCapture auditId={audit.id} hasSavings={!isOptimal} />

            {/* Audit metadata */}
            <div className="card p-5">
              <p className="font-display font-700 text-sm text-ink mb-3">
                Audit details
              </p>
              <dl className="space-y-2">
                {[
                  [
                    "Total monthly spend",
                    `$${audit.totalMonthlySpend.toLocaleString()}`,
                  ],
                  [
                    "Potential monthly savings",
                    `$${audit.totalMonthlySavings.toLocaleString()}`,
                  ],
                  [
                    "Potential annual savings",
                    `$${audit.totalAnnualSavings.toLocaleString()}`,
                  ],
                  ["Team size", `${audit.teamSize} people`],
                  ["Primary use case", audit.useCase],
                  [
                    "Spend per developer",
                    `$${audit.spendPerDeveloper}/mo`,
                  ],
                  [
                    "Industry average",
                    `$${audit.industryAvgPerDeveloper}/dev/mo`,
                  ],
                  [
                    "Audit date",
                    new Date(audit.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }),
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-2">
                    <dt className="font-body text-xs text-ink/40 flex-shrink-0">
                      {label}
                    </dt>
                    <dd className="font-mono text-xs text-ink font-500 text-right">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Share again */}
            <div className="card p-5">
              <p className="font-display font-700 text-sm text-ink mb-1">
                Share this audit
              </p>
              <p className="font-body text-xs text-ink/50 mb-3">
                Company name and email are never included in the public URL.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="input text-xs py-2 flex-1 font-mono"
                  aria-label="Shareable audit URL"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="px-3 py-2 bg-ink text-paper rounded-lg text-xs font-display font-700 hover:bg-ink/80 transition-colors flex-shrink-0"
                  aria-label="Copy URL"
                >
                  {copied ? "✓" : "Copy"}
                </button>
              </div>
            </div>

            {/* Run another */}
            <Link
              href="/"
              className="block w-full py-3 border-2 border-ink text-ink font-display font-700 text-sm rounded-xl text-center hover:bg-ink hover:text-paper transition-all duration-150"
            >
              ← Run Another Audit
            </Link>

            {/* Re-audit Diff View */}
            <Link
              href={`/reaudit/${audit.id}`}
              className="block w-full mt-3 py-3 border-2 border-acid bg-acid text-ink font-display font-700 text-sm rounded-xl text-center hover:opacity-80 transition-all duration-150"
            >
              ⟲ Check Current Pricing (Diff View)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
