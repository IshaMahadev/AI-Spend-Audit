import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runAudit } from "@/lib/audit";
import { saveAudit } from "@/lib/auditStorage";
import { checkRateLimit } from "@/lib/ratelimit";
import type { UserInputData } from "@/lib/types";

const subscriptionSchema = z.object({
  id: z.string(),
  toolName: z.string(),
  plan: z.string(),
  spend: z.number().min(0),
  seats: z.number().int().min(1),
});

const formSchema = z.object({
  email: z.string().email(),
  teamSize: z.number().int().min(1).max(100_000),
  primaryUseCase: z.enum(["coding", "writing", "data", "research", "mixed"]),
  subscriptions: z.array(subscriptionSchema).min(1).max(20),
});

export async function POST(req: NextRequest) {
  // Rate limit by IP — 10 audits/min per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!checkRateLimit(`audit:${ip}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = formSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const email = parsed.data.email;
  const audit = runAudit(parsed.data as unknown as UserInputData);

  try {
    await saveAudit(email, parsed.data as unknown as UserInputData, audit);
  } catch (err) {
    console.error("DB save failed:", err);
    // Return the audit anyway — don't block the user because DB is down
    return NextResponse.json({ audit }, { status: 200 });
  }

  return NextResponse.json({ audit }, { status: 201 });
}
