import Link from "next/link";
import { prisma } from "@/lib/supabase";
import { CURRENT_PRICING } from "@/lib/pricing";

export const revalidate = 3600; // cache for 1 hour

const TOOL_COLORS: Record<string, string> = {
  Cursor: "#C8FF00",
  Claude: "#FF8C69",
  "GitHub Copilot": "#4FACFE",
  ChatGPT: "#10B981",
};

function priceDelta(oldPrice: number, newPrice: number) {
  const delta = newPrice - oldPrice;
  const pct = Math.round(Math.abs((delta / oldPrice) * 100));
  return { delta, pct, up: delta > 0 };
}

export default async function ChangesPage() {
  const changes = await prisma.pricingChangeLog.findMany({
    orderBy: { detectedAt: "desc" },
    take: 100,
  });

  // Group by week
  const grouped: Record<string, typeof changes> = {};
  for (const c of changes) {
    const weekStart = new Date(c.detectedAt);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const key = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  }

  const currentPrices = [
    { tool: "Cursor",         plan: "Pro",        price: CURRENT_PRICING.cursor.pro },
    { tool: "Cursor",         plan: "Business",   price: CURRENT_PRICING.cursor.business },
    { tool: "Claude",         plan: "Pro",        price: CURRENT_PRICING.claude.pro },
    { tool: "Claude",         plan: "Team",       price: CURRENT_PRICING.claude.team },
    { tool: "GitHub Copilot", plan: "Individual", price: CURRENT_PRICING.copilot.individual },
    { tool: "GitHub Copilot", plan: "Business",   price: CURRENT_PRICING.copilot.business },
    { tool: "GitHub Copilot", plan: "Enterprise", price: CURRENT_PRICING.copilot.enterprise },
    { tool: "ChatGPT",        plan: "Plus",       price: CURRENT_PRICING.chatgpt.plus },
    { tool: "ChatGPT",        plan: "Team",       price: CURRENT_PRICING.chatgpt.team },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink pb-20">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-paper/90 backdrop-blur-md border-b border-ink/8">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-ink rounded-lg flex items-center justify-center">
              <span className="text-acid text-xs font-display font-800">A</span>
            </div>
            <span className="font-display font-700 text-ink text-sm tracking-tight">auditly</span>
          </Link>
          <Link href="/" className="btn-secondary text-xs py-1.5 px-4">Run Free Audit →</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12 space-y-12">
        {/* Hero */}
        <div className="card-dark p-8 noise relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(ellipse 60% 60% at 20% 50%, #C8FF00 0%, transparent 70%)" }} aria-hidden />
          <div className="relative z-10">
            <p className="font-mono text-xs text-acid uppercase tracking-widest mb-2">Live Market Intelligence</p>
            <h1 className="font-display font-800 text-4xl md:text-5xl text-paper leading-tight mb-3">
              What changed in AI tooling
            </h1>
            <p className="font-body text-paper/60 text-base max-w-xl">
              We track pricing across every major AI tool. Whenever a price moves, it appears here — before most people notice.
            </p>
          </div>
        </div>

        {/* Current prices snapshot */}
        <section className="space-y-4">
          <h2 className="font-display font-700 text-lg text-ink">Current Prices</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {currentPrices.map((item) => (
              <div key={`${item.tool}-${item.plan}`} className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: TOOL_COLORS[item.tool] ?? "#C8FF00" }}
                  />
                  <p className="font-display font-700 text-xs text-ink">{item.tool}</p>
                </div>
                <p className="font-mono text-2xs text-ink/40 uppercase mb-1">{item.plan}</p>
                <p className="font-display font-800 text-xl text-ink">
                  ${item.price}<span className="text-xs text-ink/40 font-400">/mo</span>
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Change history */}
        <section className="space-y-6">
          <h2 className="font-display font-700 text-lg text-ink">
            Change History
            <span className="font-mono font-400 text-sm text-ink/40 ml-2">({changes.length} detected)</span>
          </h2>

          {changes.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="font-display font-700 text-ink mb-2">No changes detected yet</p>
              <p className="font-body text-sm text-ink/50">
                Prices are currently stable. We'll log changes here as soon as any tool updates its pricing.
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([week, weekChanges]) => (
              <div key={week} className="space-y-2">
                <p className="font-mono text-xs text-ink/40 uppercase tracking-widest px-1">
                  Week of {week}
                </p>
                <div className="card overflow-hidden">
                  <div className="divide-y divide-ink/8">
                    {weekChanges.map((c) => {
                      const { delta, pct, up } = priceDelta(c.oldPrice, c.newPrice);
                      return (
                        <div key={c.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-ink/2 transition-colors">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ background: TOOL_COLORS[c.tool] ?? "#C8FF00" }}
                            />
                            <div>
                              <p className="font-display font-700 text-sm text-ink">
                                {c.tool} <span className="font-400 text-ink/50">{c.plan}</span>
                              </p>
                              <p className="font-mono text-xs text-ink/40">
                                {c.detectedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs text-ink/40 line-through">${c.oldPrice}/mo</span>
                            <span className="font-mono text-sm font-700 text-ink">${c.newPrice}/mo</span>
                            <span className={`font-mono text-xs font-700 px-2 py-0.5 rounded-full ${up ? "bg-coral/15 text-coral" : "bg-acid/15 text-ink"}`}>
                              {up ? "+" : "−"}{pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>

        {/* CTA */}
        <div className="card-dark p-8 noise text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(ellipse 50% 80% at 50% 50%, #C8FF00 0%, transparent 70%)" }} aria-hidden />
          <div className="relative z-10">
            <p className="font-display font-800 text-2xl text-paper mb-2">Is your team overpaying?</p>
            <p className="font-body text-paper/60 text-sm mb-5">Run a free audit — we'll check every tool in your stack against current prices.</p>
            <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-acid text-ink font-display font-700 text-sm rounded-lg hover:bg-acid-dim transition-colors">
              Run Free Audit →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
