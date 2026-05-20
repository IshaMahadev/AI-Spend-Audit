import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/supabase";
import { runAudit } from "@/lib/audit";
import { CURRENT_PRICING } from "@/lib/pricing";
import { saveAudit } from "@/lib/auditStorage";
import type { AuditResult } from "@/types";
import type { UserInputData } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const originalAudit = await prisma.audit.findUnique({
      where: { id },
    });

    if (!originalAudit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    const originalResult = originalAudit.outputResult as unknown as AuditResult;
    const inputStack = originalAudit.inputStack as unknown as UserInputData;

    // Run updated audit
    const newAuditResult = runAudit(inputStack, CURRENT_PRICING);

    // Save re-audit
    let savedReaudit: any = null;
    try {
      savedReaudit = await saveAudit(
        originalAudit.userEmail,
        inputStack,
        newAuditResult,
        originalAudit.id
      );
    } catch (err) {
      console.error("Failed to save re-audit in API:", err);
    }

    const origSavings = originalResult.totalMonthlySavings;
    const newSavings = newAuditResult.totalMonthlySavings;
    const savingsDelta = newSavings - origSavings;

    return NextResponse.json({
      original: {
        id: originalAudit.id,
        userEmail: originalAudit.userEmail,
        createdAt: originalAudit.createdAt,
        pricingSnapshot: originalAudit.pricingSnapshot,
        outputResult: originalResult,
      },
      updated: {
        id: savedReaudit?.id ?? newAuditResult.id,
        createdAt: savedReaudit?.createdAt ?? new Date().toISOString(),
        pricingSnapshot: CURRENT_PRICING,
        outputResult: newAuditResult,
      },
      savingsDelta,
    });
  } catch (error: any) {
    console.error("Programmatic re-audit API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
