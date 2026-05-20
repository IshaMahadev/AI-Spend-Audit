"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InputForm from "@/components/InputForm";
import { UserInputData } from "@/lib/types";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAudit = async (data: UserInputData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json();
        let message = errData.error || "Failed to run audit";
        if (errData.details && errData.details.fieldErrors) {
          const fieldErrors = Object.entries(errData.details.fieldErrors)
            .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`)
            .join("; ");
          if (fieldErrors) {
            message = `${message} (${fieldErrors})`;
          }
        }
        throw new Error(message);
      }

      const { audit } = await res.json();
      // Cache in sessionStorage so the audit page can recover if DB is unreachable
      sessionStorage.setItem(`audit:${audit.id}`, JSON.stringify(audit));
      router.push(`/audit/${audit.id}`);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-paper text-ink p-6 md:p-12 relative z-10 font-body">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="text-center space-y-4 pt-12 pb-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-9 h-9 bg-ink rounded-lg flex items-center justify-center">
              <span className="text-acid text-sm font-display font-extrabold">
                A
              </span>
            </div>
            <span className="font-display font-bold text-ink text-lg tracking-tight">
              auditly
            </span>
          </div>
          <div className="inline-block border border-acid bg-acid/10 text-ink px-3 py-1 text-xs font-mono font-medium uppercase tracking-widest mb-4">
            Free AI Spend Audit
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tight text-ink">
            Stop overpaying for AI tools
          </h1>
          <p className="text-ink/50 text-lg md:text-xl font-body max-w-2xl mx-auto">
            Input your stack, get a brutal, mathematically-defensible analysis
            of where you&apos;re leaking capital.
          </p>
        </header>

        {error && (
          <div className="max-w-3xl mx-auto p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-body">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-14 h-14 border-[3px] border-ink/10 border-t-acid rounded-full animate-spin"></div>
            <div className="font-mono text-ink/50 text-sm animate-pulse uppercase tracking-widest">
              Analyzing Stack...
            </div>
          </div>
        ) : (
          <InputForm onSubmit={handleAudit} />
        )}
      </div>
    </main>
  );
}
