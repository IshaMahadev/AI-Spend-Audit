import Link from "next/link";
import { prisma } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [
    totalAudits,
    totalReaudits,
    totalEmailLogs,
    clickedEmailLogs,
    totalUnsubscribes,
    recentAudits,
    recentChanges,
    recentEmails,
  ] = await Promise.all([
    prisma.audit.count({ where: { reauditParentId: null } }),
    prisma.audit.count({ where: { reauditParentId: { not: null } } }),
    prisma.emailLog.count(),
    prisma.emailLog.count({ where: { clickedAt: { not: null } } }),
    prisma.unsubscribe.count(),
    prisma.audit.findMany({
      where: { reauditParentId: null },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.pricingChangeLog.findMany({
      orderBy: { detectedAt: "desc" },
      take: 6,
    }),
    prisma.emailLog.findMany({
      orderBy: { sentAt: "desc" },
      take: 6,
    }),
  ]);

  const clickRate = totalEmailLogs > 0
    ? Math.round((clickedEmailLogs / totalEmailLogs) * 100)
    : 0;

  const stats = [
    { label: "Total Audits",       value: totalAudits,       sub: "original submissions",       color: "#C8FF00" },
    { label: "Re-Audits Run",      value: totalReaudits,     sub: "via pricing change links",   color: "#4FACFE" },
    { label: "Emails Sent",        value: totalEmailLogs,    sub: "pricing change notifications", color: "#FF8C69" },
    { label: "Click-Through Rate", value: `${clickRate}%`,   sub: `${clickedEmailLogs} of ${totalEmailLogs} clicked`, color: "#10B981" },
    { label: "Unsubscribes",       value: totalUnsubscribes, sub: "opted out of emails",        color: "#FF6B6B" },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink pb-20">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-paper/90 backdrop-blur-md border-b border-ink/8">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-ink rounded-lg flex items-center justify-center">
              <span className="text-acid text-xs font-display font-800">A</span>
            </div>
            <span className="font-display font-700 text-ink text-sm tracking-tight">auditly</span>
            <span className="font-mono text-xs text-ink/40 border border-ink/20 rounded px-1.5 py-0.5 ml-1">admin</span>
          </Link>
          <div className="flex gap-2">
            <Link href="/changes" className="btn-ghost text-xs">Public Changes ↗</Link>
            <Link href="/" className="btn-secondary text-xs py-1.5 px-4">← Home</Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10 space-y-10">
        <div>
          <p className="font-mono text-xs text-ink/40 uppercase tracking-widest mb-1">Admin Dashboard</p>
          <h1 className="font-display font-800 text-3xl text-ink">Overview</h1>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="card p-5 space-y-2">
              <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              <p className="font-display font-800 text-3xl text-ink">{s.value}</p>
              <div>
                <p className="font-display font-700 text-xs text-ink">{s.label}</p>
                <p className="font-mono text-2xs text-ink/40 mt-0.5 leading-snug">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Audits */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="font-display font-700 text-base text-ink">Recent Audits</h2>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-paper-warm border-b border-ink/8 font-mono text-2xs uppercase text-ink/40">
                    <th className="p-3 text-left font-semibold">Email</th>
                    <th className="p-3 text-left font-semibold">Date</th>
                    <th className="p-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/6">
                  {recentAudits.map((a) => (
                    <tr key={a.id} className="hover:bg-ink/2 transition-colors">
                      <td className="p-3 font-body text-ink/80 truncate max-w-[200px]">{a.userEmail}</td>
                      <td className="p-3 font-mono text-xs text-ink/40 whitespace-nowrap">
                        {a.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <Link href={`/audit/${a.id}`} className="font-mono text-xs text-ink/50 hover:text-ink transition-colors">
                            View
                          </Link>
                          <Link href={`/reaudit/${a.id}`} className="font-mono text-xs text-acid hover:opacity-80 transition-opacity">
                            Re-audit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {recentAudits.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-6 text-center font-body text-sm text-ink/30">No audits yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Recent pricing changes */}
            <div className="space-y-2">
              <h2 className="font-display font-700 text-base text-ink">Pricing Changes</h2>
              <div className="card divide-y divide-ink/8">
                {recentChanges.map((c) => (
                  <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-display font-700 text-xs text-ink">{c.tool} {c.plan}</p>
                      <p className="font-mono text-2xs text-ink/40">
                        {c.detectedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-mono text-xs text-ink/40 line-through">${c.oldPrice}</p>
                      <p className="font-mono text-sm font-700 text-ink">${c.newPrice}</p>
                    </div>
                  </div>
                ))}
                {recentChanges.length === 0 && (
                  <p className="p-4 text-center font-body text-xs text-ink/30">No changes logged</p>
                )}
              </div>
            </div>

            {/* Recent email sends */}
            <div className="space-y-2">
              <h2 className="font-display font-700 text-base text-ink">Recent Emails</h2>
              <div className="card divide-y divide-ink/8">
                {recentEmails.map((e) => (
                  <div key={e.id} className="px-4 py-3 flex items-center justify-between gap-2">
                    <p className="font-body text-xs text-ink/70 truncate">{e.email}</p>
                    <span className={`font-mono text-2xs px-1.5 py-0.5 rounded flex-shrink-0 ${e.clickedAt ? "bg-acid/15 text-ink" : "bg-ink/6 text-ink/40"}`}>
                      {e.clickedAt ? "clicked" : "sent"}
                    </span>
                  </div>
                ))}
                {recentEmails.length === 0 && (
                  <p className="p-4 text-center font-body text-xs text-ink/30">No emails sent yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
