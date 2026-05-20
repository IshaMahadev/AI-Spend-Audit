/**
 * Database abstraction layer.
 *
 * Named "supabase" to match the import paths from the Claude-generated routes,
 * but actually backed by Prisma 7 + SQLite (via better-sqlite3 adapter) for local/demo use.
 * Swap the internals for a real Supabase client when deploying to production.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { AuditResult } from "@/types";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/* ------------------------------------------------------------------ */
/*  Audit CRUD                                                        */
/* ------------------------------------------------------------------ */

import { CURRENT_PRICING } from "./pricing";

export async function saveAudit(audit: AuditResult): Promise<void> {
  await prisma.audit.create({
    data: {
      id: audit.id,
      userEmail: "legacy@example.com",
      inputStack: {} as any,
      outputResult: audit as any,
      pricingSnapshot: CURRENT_PRICING,
    },
  });
}

export async function getAudit(id: string): Promise<AuditResult | null> {
  const record = await prisma.audit.findUnique({ where: { id } });
  if (!record) return null;

  const data = record.outputResult as unknown as AuditResult;
  if (data) {
    data.createdAt = record.createdAt.toISOString();
  }
  return data;
}

export async function updateAuditSummary(
  id: string,
  summary: string
): Promise<void> {
  const record = await prisma.audit.findUnique({ where: { id } });
  if (!record) return;

  const outputResult = record.outputResult as any;
  if (outputResult) {
    outputResult.aiSummary = summary;
    await prisma.audit.update({
      where: { id },
      data: { outputResult },
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Lead CRUD                                                         */
/* ------------------------------------------------------------------ */

export async function saveLead(data: {
  auditId: string;
  email: string;
  companyName?: string;
  role?: string;
  teamSize?: number;
}): Promise<void> {
  await prisma.lead.create({
    data: {
      email: data.email,
      companyName: data.companyName,
      role: data.role,
      teamSize: data.teamSize?.toString(),
      auditId: data.auditId,
    },
  });
}

export async function leadExists(email: string): Promise<boolean> {
  const count = await prisma.lead.count({ where: { email } });
  return count > 0;
}
