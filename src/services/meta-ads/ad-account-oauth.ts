/**
 * OAuth for connecting a real Meta (Facebook) Ads Manager ad account —
 * separate from the organic Facebook/Instagram Page connection in
 * `services/social/oauth/providers.ts`. Same Meta developer app and
 * client credentials, but a different permission scope (ads_management /
 * ads_read / business_management instead of pages_manage_posts) and a
 * different Graph object (an Ad Account from Business Manager, not a
 * Page). Stored in the same `platform_connections` table, distinguished
 * by `account_kind: "ad_account"` so it can coexist with a Page
 * connection for the same business.
 */

const META_API_VERSION = "v21.0";

export interface AdAccountProfile {
  /** Bare numeric ad account id (no "act_" prefix) — matches what
   * `MetaAdsInsightsService.fetchAdsWithInsights` expects to prefix itself. */
  externalId: string;
  name: string;
  currency: string;
  timezoneName: string;
  accountStatus: number;
  amountSpent: string;
  balance: string;
  businessName?: string;
}

export function isMetaAdsAccountConfigured(): boolean {
  return !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET);
}

export function buildAdAccountAuthUrl({ redirectUri, state }: { redirectUri: string; state: string }): string {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_CLIENT_ID || "",
    redirect_uri: redirectUri,
    state,
    scope: "ads_management,ads_read,business_management,public_profile",
    response_type: "code",
  });
  return `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?${params.toString()}`;
}

export async function exchangeAdAccountCode({ code, redirectUri }: { code: string; redirectUri: string }): Promise<{ accessToken: string; expiresInSeconds?: number }> {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_CLIENT_ID || "",
    client_secret: process.env.FACEBOOK_CLIENT_SECRET || "",
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Meta token exchange failed");
  return { accessToken: data.access_token, expiresInSeconds: data.expires_in };
}

export async function fetchAdAccountProfile(accessToken: string): Promise<AdAccountProfile> {
  const res = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/me/adaccounts?fields=account_id,name,account_status,currency,timezone_name,amount_spent,balance,business{name}&access_token=${accessToken}`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Failed to fetch Meta ad accounts");
  const account = data.data?.[0];
  if (!account) throw new Error("No ad account found for this Meta login — make sure this account has access to an ad account in Business Manager.");
  return {
    externalId: account.account_id,
    name: account.name,
    currency: account.currency,
    timezoneName: account.timezone_name,
    accountStatus: account.account_status,
    amountSpent: account.amount_spent,
    balance: account.balance,
    businessName: account.business?.name,
  };
}
