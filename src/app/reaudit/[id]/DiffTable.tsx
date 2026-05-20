"use client";

import { useState } from "react";
import type { AuditResult, ToolRecommendation } from "@/types";

interface Comparison {
  toolName: string;
  orig: ToolRecommendation | undefined;
  updated: ToolRecommendation | undefined;
  status: "better" | "worse" | "same";
  origSavingsVal: number;
  updatedSavingsVal: number;
}

export default function DiffTable({ comparisons }: { comparisons: Comparison[] }) {
  const [showSame, setShowSame] = useState(false);

  const actionRows = comparisons.filter((c) => c.status !== "same");
  const sameRows = comparisons.filter((c) => c.status === "same");
  const visible = showSame ? comparisons : actionRows;

  return (
    <div className="space-y-3">
      <div className="card overflow-hidden border-ink/8">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-paper-warm border-b border-ink/8 font-mono text-2xs uppercase text-ink/50">
                <th className="p-4 font-semibold">Tool</th>
                <th className="p-4 font-semibold">Original Analysis</th>
                <th className="p-4 font-semibold">Updated Analysis</th>
                <th className="p-4 font-semibold text-right">Savings Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/8 text-sm">
              {visible.map((comp) => {
                let rowBgClass = "";
                if (comp.status === "better") {
                  rowBgClass = "bg-acid/5 hover:bg-acid/10 transition-colors";
                } else if (comp.status === "worse") {
                  rowBgClass = "bg-coral/5 hover:bg-coral/10 transition-colors";
                } else {
                  rowBgClass = "opacity-60 hover:opacity-100 transition-opacity";
                }

                return (
                  <tr key={comp.toolName} className={rowBgClass}>
                    <td className="p-4 font-medium align-top">
                      <p className="font-display font-700 text-ink">{comp.toolName}</p>
                      <p className="font-mono text-2xs text-ink/40 mt-0.5">
                        {comp.orig?.currentSeats ?? comp.updated?.currentSeats ?? 0} seats ·{" "}
                        {comp.orig?.currentPlan ?? comp.updated?.currentPlan ?? "N/A"}
                      </p>
                    </td>

                    <td className="p-4 align-top max-w-xs space-y-1">
                      {comp.orig ? (
                        <>
                          <p className="font-medium text-ink/80">{comp.orig.recommendedAction}</p>
                          <p className="text-xs text-ink/50 leading-relaxed font-body">
                            {comp.orig.reasoning}
                          </p>
                        </>
                      ) : (
                        <span className="text-ink/30 italic">Not in original stack</span>
                      )}
                    </td>

                    <td className="p-4 align-top max-w-xs space-y-1">
                      {comp.updated ? (
                        <>
                          <p className="font-medium text-ink/80">{comp.updated.recommendedAction}</p>
                          <p className="text-xs text-ink/50 leading-relaxed font-body">
                            {comp.updated.reasoning}
                          </p>
                        </>
                      ) : (
                        <span className="text-ink/30 italic">Removed from stack</span>
                      )}
                    </td>

                    <td className="p-4 align-top font-mono text-right whitespace-nowrap">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-ink/50">
                          Orig: ${comp.origSavingsVal}/mo
                        </span>
                        <span className="text-xs font-semibold text-ink">
                          New: ${comp.updatedSavingsVal}/mo
                        </span>
                        {comp.status === "better" && (
                          <span className="tag-green text-3xs py-0.5 px-1 font-bold">
                            +${comp.updatedSavingsVal - comp.origSavingsVal}/mo
                          </span>
                        )}
                        {comp.status === "worse" && (
                          <span className="tag-red text-3xs py-0.5 px-1 font-bold">
                            −${comp.origSavingsVal - comp.updatedSavingsVal}/mo
                          </span>
                        )}
                        {comp.status === "same" && (
                          <span className="tag text-3xs py-0.5 px-1">unchanged</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Empty state when all rows are "same" */}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center font-body text-sm text-ink/40">
                    No recommendation changes detected.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toggle button for same rows */}
      {sameRows.length > 0 && (
        <button
          type="button"
          onClick={() => setShowSame((v) => !v)}
          className="w-full py-2.5 text-xs font-mono text-ink/50 hover:text-ink border border-dashed border-ink/20 hover:border-ink/40 rounded-lg transition-colors"
        >
          {showSame
            ? `▲ Hide ${sameRows.length} unchanged tool${sameRows.length > 1 ? "s" : ""}`
            : `▼ Show ${sameRows.length} unchanged tool${sameRows.length > 1 ? "s" : ""} (same recommendation)`}
        </button>
      )}
    </div>
  );
}
