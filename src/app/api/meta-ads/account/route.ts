import { NextResponse } from "next/server";
import { env } from "@/config";

/**
 * Ports the legacy project's approach exactly: a single Meta System User
 * access token + ad account id, set once as env vars, no per-user OAuth
 * "Connect" flow (see projects/meta/src/app/api/meta/live-campaigns/route.ts —
 * `META_ACCESS_TOKEN` / `META_AD_ACCOUNT_ID`). Single-tenant, so
 * there's nothing an OAuth dance would buy us over just configuring these once.
 */
const META_API_VERSION = "v21.0";

export async function GET() {
  const accessToken = env.META_ACCESS_TOKEN;
  const adAccountId = env.META_AD_ACCOUNT_ID;

  if (!accessToken || !adAccountId) {
    return NextResponse.json({ configured: false });
  }

  const res = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}?fields=name,account_status,currency,timezone_name,amount_spent,balance,business{name}&access_token=${accessToken}`
  );
  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ configured: true, error: data.error?.message || "Failed to fetch Meta ad account" }, { status: 502 });
  }

  return NextResponse.json({
    configured: true,
    profile: {
      externalId: adAccountId,
      name: data.name,
      currency: data.currency,
      timezoneName: data.timezone_name,
      accountStatus: data.account_status,
      amountSpent: data.amount_spent,
      balance: data.balance,
      businessName: data.business?.name,
    },
  });
}
