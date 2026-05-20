import { createHmac } from "crypto";

const SECRET = process.env.UNSUBSCRIBE_SECRET ?? "auditly-unsub-secret-2025";

/** Generate a signed token so unsubscribe links can't be forged */
export function generateUnsubToken(email: string): string {
  return createHmac("sha256", SECRET).update(email).digest("hex");
}

/** Verify a token matches the email */
export function verifyUnsubToken(email: string, token: string): boolean {
  const expected = generateUnsubToken(email);
  // Constant-time comparison
  if (expected.length !== token.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return mismatch === 0;
}
