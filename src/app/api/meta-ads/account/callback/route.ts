import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { exchangeAdAccountCode, fetchAdAccountProfile } from "@/services/meta-ads/ad-account-oauth";

export async function GET(request: NextRequest) {
  const redirectBase = new URL("/meta-ads/account", request.url);

  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const expectedState = request.cookies.get("oauth_state_meta_ads_account")?.value;

  const fail = (reason: string, message?: string) => {
    redirectBase.searchParams.set("error", reason);
    if (message) redirectBase.searchParams.set("message", message.slice(0, 200));
    const response = NextResponse.redirect(redirectBase);
    response.cookies.delete("oauth_state_meta_ads_account");
    return response;
  };

  if (oauthError) return fail(oauthError);
  if (!code || !state || !expectedState || state !== expectedState) return fail("invalid_state");

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const redirectUri = `${appUrl}/api/meta-ads/account/callback`;

    const token = await exchangeAdAccountCode({ code, redirectUri });
    const profile = await fetchAdAccountProfile(token.accessToken);

    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { data: business } = await supabase.from("businesses").select("id").limit(1).single();
    if (!business) throw new Error("No business found");

    const expiresAt = token.expiresInSeconds ? new Date(Date.now() + token.expiresInSeconds * 1000).toISOString() : null;

    const { error } = await supabase.from("platform_connections").upsert(
      {
        business_id: business.id,
        platform: "facebook",
        account_kind: "ad_account",
        external_id: profile.externalId,
        display_name: profile.name,
        access_token_ref: token.accessToken,
        token_expires_at: expiresAt,
        status: "connected",
        metadata: {
          currency: profile.currency,
          timezoneName: profile.timezoneName,
          accountStatus: profile.accountStatus,
          amountSpent: profile.amountSpent,
          balance: profile.balance,
          businessName: profile.businessName,
        },
      },
      { onConflict: "business_id,platform,account_kind,external_id" }
    );
    if (error) throw new Error(error.message);

    redirectBase.searchParams.set("connected", "1");
    const response = NextResponse.redirect(redirectBase);
    response.cookies.delete("oauth_state_meta_ads_account");
    return response;
  } catch (e: any) {
    console.error("[META_ADS_ACCOUNT_CALLBACK]", e);
    return fail("connection_failed", e.message);
  }
}
