import crypto from "crypto";

/** OAuth 2.0 PKCE + CSRF-state helpers, used by providers whose
 * authorization flow requires a code_verifier/code_challenge pair (X). */

export function generateState(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}
