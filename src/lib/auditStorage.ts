import { prisma } from "./supabase";
import { CURRENT_PRICING } from "./pricing";
import type { AuditResult } from "@/types";
import type { UserInputData } from "./types";

/**
 * Saves a generated audit to the database.
 */
export async function saveAudit(
  userEmail: string,
  inputStack: UserInputData,
  outputResult: AuditResult,
  reauditParentId: string | null = null
) {
  return await prisma.audit.create({
    data: {
      id: outputResult.id,
      userEmail,
      inputStack: inputStack as any,
      outputResult: outputResult as any,
      pricingSnapshot: CURRENT_PRICING,
      reauditParentId,
    },
  });
}

/**
 * Retrieves an audit by its ID.
 */
export async function getAuditById(id: string) {
  return await prisma.audit.findUnique({
    where: { id },
  });
}
