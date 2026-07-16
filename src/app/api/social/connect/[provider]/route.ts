import { NextRequest, NextResponse } from "next/server";
import { SOCIAL_PROVIDERS, SocialPlatform } from "@/services/social/oauth/providers";
import { generateState, generateCodeVerifier, generateCodeChallenge } from "@/services/social/oauth/pkce";

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const config = SOCIAL_PROVIDERS[provider as SocialPlatform];

  const redirectBase = new URL("/social/connected-accounts", request.url);

  if (!config) {
    redirectBase.searchParams.set("error", "unknown_provider");
    return NextResponse.redirect(redirectBase);
  }
  if (!config.isConfigured()) {
    redirectBase.searchParams.set("error", "not_configured");
    redirectBase.searchParams.set("platform", provider);
    return NextResponse.redirect(redirectBase);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const redirectUri = `${appUrl}/api/social/callback/${provider}`;
  const state = generateState();

  let codeChallenge: string | undefined;
  let codeVerifier: string | undefined;
  if (config.usesPKCE) {
    codeVerifier = generateCodeVerifier();
    codeChallenge = generateCodeChallenge(codeVerifier);
  }

  const authUrl = config.buildAuthUrl({ redirectUri, state, codeChallenge });
  const response = NextResponse.redirect(authUrl);

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
    sameSite: "lax" as const,
  };
  response.cookies.set(`oauth_state_${provider}`, state, cookieOpts);
  if (codeVerifier) response.cookies.set(`oauth_verifier_${provider}`, codeVerifier, cookieOpts);

  return response;
}
