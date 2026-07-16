import { NextRequest, NextResponse } from "next/server";
import { generateState } from "@/services/social/oauth/pkce";
import { isMetaAdsAccountConfigured, buildAdAccountAuthUrl } from "@/services/meta-ads/ad-account-oauth";

export async function GET(request: NextRequest) {
  const redirectBase = new URL("/meta-ads/account", request.url);

  if (!isMetaAdsAccountConfigured()) {
    redirectBase.searchParams.set("error", "not_configured");
    return NextResponse.redirect(redirectBase);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const redirectUri = `${appUrl}/api/meta-ads/account/callback`;
  const state = generateState();
  const authUrl = buildAdAccountAuthUrl({ redirectUri, state });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("oauth_state_meta_ads_account", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
