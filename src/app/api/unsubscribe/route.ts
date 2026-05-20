import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/supabase";
import { verifyUnsubToken } from "@/lib/unsubToken";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  const token = req.nextUrl.searchParams.get("token");

  if (!email || !token) {
    return new NextResponse(unsubPage("Invalid link", "The unsubscribe link is missing required parameters.", false), {
      headers: { "Content-Type": "text/html" },
      status: 400,
    });
  }

  if (!verifyUnsubToken(email, token)) {
    return new NextResponse(unsubPage("Invalid link", "This unsubscribe link is invalid or has been tampered with.", false), {
      headers: { "Content-Type": "text/html" },
      status: 403,
    });
  }

  try {
    await prisma.unsubscribe.upsert({
      where: { email },
      update: {},
      create: { email },
    });

    return new NextResponse(unsubPage("Unsubscribed ✓", `${email} has been removed from all future re-audit notifications.`, true), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    console.error("Unsubscribe error:", err);
    return new NextResponse(unsubPage("Error", "Something went wrong. Please try again.", false), {
      headers: { "Content-Type": "text/html" },
      status: 500,
    });
  }
}

function unsubPage(title: string, message: string, success: boolean) {
  const color = success ? "#C8FF00" : "#FF6B6B";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Auditly</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #0A0A0F; color: #F7F6F2; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #1a1a24; border: 1px solid rgba(255,255,255,0.08); border-radius: 1rem; padding: 2.5rem; max-width: 420px; text-align: center; }
    .icon { width: 56px; height: 56px; border-radius: 50%; background: ${color}22; border: 2px solid ${color}; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-size: 1.5rem; }
    h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.75rem; color: ${color}; }
    p { font-size: 0.9rem; color: rgba(247,246,242,0.6); line-height: 1.6; margin: 0 0 1.5rem; }
    a { display: inline-block; padding: 0.625rem 1.5rem; background: ${color}; color: #0A0A0F; font-weight: 700; font-size: 0.875rem; border-radius: 0.5rem; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? "✓" : "✕"}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/">← Back to Auditly</a>
  </div>
</body>
</html>`;
}
