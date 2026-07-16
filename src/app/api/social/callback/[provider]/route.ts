import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { SOCIAL_PROVIDERS, SocialPlatform } from "@/services/social/oauth/providers";

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const redirectBase = new URL("/social/connected-accounts", request.url);

  const config = SOCIAL_PROVIDERS[provider as SocialPlatform];
  if (!config) {
    redirectBase.searchParams.set("error", "unknown_provider");
    return NextResponse.redirect(redirectBase);
  }

  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const expectedState = request.cookies.get(`oauth_state_${provider}`)?.value;
  const codeVerifier = request.cookies.get(`oauth_verifier_${provider}`)?.value;

  const fail = (reason: string, message?: string) => {
    redirectBase.searchParams.set("error", reason);
    redirectBase.searchParams.set("platform", provider);
    if (message) redirectBase.searchParams.set("message", message.slice(0, 200));
    const response = NextResponse.redirect(redirectBase);
    response.cookies.delete(`oauth_state_${provider}`);
    response.cookies.delete(`oauth_verifier_${provider}`);
    return response;
  };

  if (oauthError) return fail(oauthError);
  if (!code || !state || !expectedState || state !== expectedState) return fail("invalid_state");

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const redirectUri = `${appUrl}/api/social/callback/${provider}`;

    const token = await config.exchangeCode({ code, redirectUri, codeVerifier });
    const profile = await config.fetchProfile(token.accessToken);

    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { data: business } = await supabase.from("businesses").select("id").limit(1).single();
    if (!business) throw new Error("No business found");

    const expiresAt = token.expiresInSeconds ? new Date(Date.now() + token.expiresInSeconds * 1000).toISOString() : null;

    const { error } = await supabase.from("platform_connections").upsert(
      {
        business_id: business.id,
        platform: config.platform,
        account_kind: profile.accountKind,
        external_id: profile.externalId,
        display_name: profile.displayName,
        access_token_ref: profile.resolvedAccessToken || token.accessToken,
        refresh_token_ref: token.refreshToken || null,
        token_expires_at: expiresAt,
        status: "connected",
        metadata: { ...profile.metadata, avatarUrl: profile.avatarUrl },
      },
      { onConflict: "business_id,platform,account_kind,external_id" }
    );

    if (error) throw new Error(error.message);

    redirectBase.searchParams.set("connected", provider);
    const response = NextResponse.redirect(redirectBase);
    response.cookies.delete(`oauth_state_${provider}`);
    response.cookies.delete(`oauth_verifier_${provider}`);
    return response;
  } catch (e: any) {
    console.error(`[SOCIAL_CALLBACK_${provider.toUpperCase()}]`, e);
    return fail("connection_failed", e.message);
  }
}
