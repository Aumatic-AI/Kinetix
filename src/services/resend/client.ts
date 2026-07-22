import { Resend } from "resend";
import crypto from "crypto";
import { env } from "@/config";

const resend = new Resend(env.RESEND_API_KEY);
const fromEmail = env.EMAIL_FROM_ADDRESS || "hello@kinetix.ai";

export interface BatchEmailInput {
  to: string;
  subject: string;
  html: string;
  /** Echoed back on the delivery webhook payload — lets an event be
   * attributed to the campaign that sent it. */
  tags?: { name: string; value: string }[];
}

/**
 * Every Resend API call for Newsletter + Outreach goes through this file —
 * replaces the old src/services/email/resend.ts (which only had a single
 * sendEmail method and wasn't used anywhere yet).
 *
 * Deliberately uses Resend's batch send API rather than its
 * Audiences/Broadcasts feature: an Audience would be a second, Resend-side
 * copy of contact/subscription state competing with our own `contacts`
 * table as the source of truth. Personalization (merge tags) is filled in
 * on our side before sending, one rendered email per recipient, batched up
 * to Resend's 100-per-call limit.
 */
export class ResendService {
  static async sendEmail(to: string | string[], subject: string, html: string) {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });
    if (error) throw new Error(error.message);
    return data;
  }

  /** Resend's batch endpoint accepts up to 100 emails per call — chunk larger lists automatically. */
  static async sendBatch(emails: BatchEmailInput[]) {
    const CHUNK_SIZE = 100;
    const results: { id: string }[] = [];
    for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
      const chunk = emails.slice(i, i + CHUNK_SIZE).map((e) => ({ from: fromEmail, to: [e.to], subject: e.subject, html: e.html, ...(e.tags ? { tags: e.tags } : {}) }));
      const { data, error } = await resend.batch.send(chunk);
      if (error) throw new Error(error.message);
      results.push(...(data?.data || []));
    }
    return results;
  }

  /**
   * Resend signs webhooks using the Svix scheme: verify against
   * RESEND_WEBHOOK_SECRET (a `whsec_...` value from the Resend dashboard).
   * Confirm this against Resend's current webhook docs before relying on
   * it in production — this ports the standard Svix verification scheme
   * but hasn't been exercised against a real Resend payload yet.
   */
  static verifyWebhookSignature(payload: string, svixId: string, svixTimestamp: string, svixSignature: string): boolean {
    const secret = env.RESEND_WEBHOOK_SECRET;
    if (!secret) return false;
    const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
    const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
    const expected = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");
    const candidates = svixSignature.split(" ").map((s) => s.split(",")[1]).filter(Boolean);
    return candidates.some((candidate) => {
      try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(candidate));
      } catch {
        return false;
      }
    });
  }
}
