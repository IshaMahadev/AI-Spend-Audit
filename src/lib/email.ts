import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// IMPORTANT: onboarding@resend.dev is Resend's shared test sender.
// In production, set FROM_EMAIL to a verified domain address e.g. "hello@yourdomain.com".
// Without a verified domain, Resend restricts delivery to your own Resend-account email only.
const FROM_EMAIL = process.env.FROM_EMAIL ?? 'Auditly <onboarding@resend.dev>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ai-spend-audit-git-round-c9f87e-ishamahadev2019-2113s-projects.vercel.app?_vercel_share=yD3Pw2WmjekifFnkG46IwP1YJa33inXX";

/**
 * Sends a transactional email containing the audit result.
 * Falls back to console.log if RESEND_API_KEY is not configured.
 */
export async function sendAuditConfirmationEmail(
  email: string,
  audit: { id: string; totalMonthlySavings: number },
  companyName?: string
): Promise<void> {
  const auditUrl = `${APP_URL}/audit/${audit.id}`;
  const subject = companyName
    ? `Your AI Spend Audit Results for ${companyName}`
    : `Your AI Spend Audit Results`;

  const textContent = `
    Hi there,

    Thanks for using Auditly. We have finished analyzing your AI infrastructure stack.

    Total Potential Monthly Savings: $${audit.totalMonthlySavings}

    You can view your full, detailed report and savings breakdown here:
    ${auditUrl}

    If you have significant savings and would like to capture them, book a free consultation with Credex to procure discounted credits.

    Best,
    The Auditly Team
  `;

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
      <h2>Your AI Spend Audit Results</h2>
      <p>Thanks for using Auditly. We have finished analyzing your AI infrastructure stack${companyName ? ` for ${companyName}` : ''}.</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0; color: #374151;">Total Potential Monthly Savings</h3>
        <p style="font-size: 32px; font-weight: bold; margin: 10px 0 0; color: #10b981;">
          $${audit.totalMonthlySavings}
        </p>
      </div>

      <p>You can view your full, detailed report and savings breakdown via your secure link below:</p>
      <p>
        <a href="${auditUrl}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          View Full Audit Report
        </a>
      </p>

      <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
        If you have significant savings and would like to capture them, <a href="https://credex.rocks">book a free consultation with Credex</a> to procure discounted credits.
      </p>
    </div>
  `;

  if (!resend) {
    console.warn(
      `[Email] RESEND_API_KEY is not set. Skipping email to ${email}.\n` +
      `[Email] Add RESEND_API_KEY to your environment variables to enable email delivery.`
    );
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: subject,
      text: textContent,
      html: htmlContent,
    });
    console.log(`[Email] Successfully sent confirmation to ${email}`);
  } catch (error) {
    console.error(`[Email Error] Failed to send email to ${email}:`, error);
    throw error;
  }
}
