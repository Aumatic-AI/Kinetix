/**
 * OAuth provider registry for the 6 social platforms Connected Accounts
 * supports. Each entry knows how to build its authorization URL, exchange
 * an auth code for a token, and fetch enough profile info to show a
 * meaningful connected-account card and to publish later.
 *
 * Facebook and Instagram share one underlying app (Meta only has a single
 * "Facebook Login for Business" OAuth flow — there is no separate
 * Instagram OAuth). Connecting Instagram walks the Pages the user granted
 * access to and finds the one with a linked Instagram Business Account;
 * the resulting Instagram Graph API calls are actually authenticated with
 * that Page's access token, not the user token — see `resolvedAccessToken`.
 */

export type SocialPlatform = "facebook" | "instagram" | "youtube" | "x" | "linkedin" | "tiktok";

export interface OAuthProfile {
  externalId: string;
  displayName: string;
  avatarUrl?: string;
  accountKind: string;
  metadata: Record<string, any>;
  /** Present when the token that should actually be persisted differs from
   * the one `exchangeCode` returned (e.g. a Facebook Page token instead of
   * the user token). */
  resolvedAccessToken?: string;
}

export interface TokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresInSeconds?: number;
}

export interface SocialProviderConfig {
  platform: SocialPlatform;
  label: string;
  brandColor: string;
  usesPKCE: boolean;
  isConfigured: () => boolean;
  buildAuthUrl: (args: { redirectUri: string; state: string; codeChallenge?: string }) => string;
  exchangeCode: (args: { code: string; redirectUri: string; codeVerifier?: string }) => Promise<TokenResult>;
  fetchProfile: (accessToken: string) => Promise<OAuthProfile>;
}

const META_API_VERSION = "v21.0";

async function metaExchangeCode({ code, redirectUri }: { code: string; redirectUri: string; codeVerifier?: string }): Promise<TokenResult> {
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

const facebook: SocialProviderConfig = {
  platform: "facebook",
  label: "Facebook",
  brandColor: "#1877F2",
  usesPKCE: false,
  isConfigured: () => !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET),
  buildAuthUrl: ({ redirectUri, state }) => {
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_CLIENT_ID || "",
      redirect_uri: redirectUri,
      state,
      scope: "pages_show_list,pages_read_engagement,pages_manage_posts,public_profile",
      response_type: "code",
    });
    return `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?${params.toString()}`;
  },
  exchangeCode: metaExchangeCode,
  fetchProfile: async (accessToken) => {
    const pagesRes = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/me/accounts?fields=id,name,access_token,picture&access_token=${accessToken}`
    );
    const pagesData = await pagesRes.json();
    if (!pagesRes.ok) throw new Error(pagesData.error?.message || "Failed to fetch Facebook Pages");
    const page = pagesData.data?.[0];
    if (!page) throw new Error("No Facebook Page found for this account — a Page is required to post ads and content.");
    return {
      externalId: page.id,
      displayName: page.name,
      avatarUrl: page.picture?.data?.url,
      accountKind: "page",
      metadata: { pageCount: pagesData.data?.length || 0 },
      resolvedAccessToken: page.access_token,
    };
  },
};

const instagram: SocialProviderConfig = {
  platform: "instagram",
  label: "Instagram",
  brandColor: "#E1306C",
  usesPKCE: false,
  isConfigured: facebook.isConfigured,
  buildAuthUrl: ({ redirectUri, state }) => {
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_CLIENT_ID || "",
      redirect_uri: redirectUri,
      state,
      scope: "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement",
      response_type: "code",
    });
    return `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?${params.toString()}`;
  },
  exchangeCode: metaExchangeCode,
  fetchProfile: async (accessToken) => {
    const pagesRes = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,profile_picture_url,followers_count}&access_token=${accessToken}`
    );
    const pagesData = await pagesRes.json();
    if (!pagesRes.ok) throw new Error(pagesData.error?.message || "Failed to fetch Instagram account");
    const pageWithIg = (pagesData.data || []).find((p: any) => p.instagram_business_account);
    if (!pageWithIg) throw new Error("No Instagram Business account is linked to any of your Facebook Pages yet.");
    const ig = pageWithIg.instagram_business_account;
    return {
      externalId: ig.id,
      displayName: `@${ig.username}`,
      avatarUrl: ig.profile_picture_url,
      accountKind: "business",
      metadata: { followers: ig.followers_count, linkedPageId: pageWithIg.id, linkedPageName: pageWithIg.name },
      resolvedAccessToken: pageWithIg.access_token,
    };
  },
};

const youtube: SocialProviderConfig = {
  platform: "youtube",
  label: "YouTube",
  brandColor: "#FF0000",
  usesPKCE: false,
  isConfigured: () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  buildAuthUrl: ({ redirectUri, state }) => {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      redirect_uri: redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope: "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },
  exchangeCode: async ({ code, redirectUri }) => {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.error || "YouTube token exchange failed");
    return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresInSeconds: data.expires_in };
  },
  fetchProfile: async (accessToken) => {
    const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Failed to fetch YouTube channel");
    const channel = data.items?.[0];
    if (!channel) throw new Error("No YouTube channel found for this Google account.");
    return {
      externalId: channel.id,
      displayName: channel.snippet?.title,
      avatarUrl: channel.snippet?.thumbnails?.default?.url,
      accountKind: "channel",
      metadata: { subscribers: channel.statistics?.subscriberCount, videoCount: channel.statistics?.videoCount },
    };
  },
};

const x: SocialProviderConfig = {
  platform: "x",
  label: "X (Twitter)",
  brandColor: "#000000",
  usesPKCE: true,
  isConfigured: () => !!(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET),
  buildAuthUrl: ({ redirectUri, state, codeChallenge }) => {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.X_CLIENT_ID || "",
      redirect_uri: redirectUri,
      scope: "tweet.read tweet.write users.read offline.access",
      state,
      code_challenge: codeChallenge || "",
      code_challenge_method: "S256",
    });
    return `https://x.com/i/oauth2/authorize?${params.toString()}`;
  },
  exchangeCode: async ({ code, redirectUri, codeVerifier }) => {
    const basicAuth = Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString("base64");
    const res = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier || "",
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.error || "X token exchange failed");
    return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresInSeconds: data.expires_in };
  },
  fetchProfile: async (accessToken) => {
    const res = await fetch("https://api.x.com/2/users/me?user.fields=profile_image_url,public_metrics", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.title || "Failed to fetch X profile");
    const user = data.data;
    return {
      externalId: user.id,
      displayName: `@${user.username}`,
      avatarUrl: user.profile_image_url,
      accountKind: "profile",
      metadata: { followers: user.public_metrics?.followers_count },
    };
  },
};

const linkedin: SocialProviderConfig = {
  platform: "linkedin",
  label: "LinkedIn",
  brandColor: "#0A66C2",
  usesPKCE: false,
  isConfigured: () => !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
  buildAuthUrl: ({ redirectUri, state }) => {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.LINKEDIN_CLIENT_ID || "",
      redirect_uri: redirectUri,
      scope: "openid profile email w_member_social",
      state,
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  },
  exchangeCode: async ({ code, redirectUri }) => {
    const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: process.env.LINKEDIN_CLIENT_ID || "",
        client_secret: process.env.LINKEDIN_CLIENT_SECRET || "",
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.error || "LinkedIn token exchange failed");
    return { accessToken: data.access_token, expiresInSeconds: data.expires_in };
  },
  fetchProfile: async (accessToken) => {
    const res = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to fetch LinkedIn profile");
    return {
      externalId: data.sub,
      displayName: data.name,
      avatarUrl: data.picture,
      accountKind: "profile",
      metadata: { email: data.email },
    };
  },
};

const tiktok: SocialProviderConfig = {
  platform: "tiktok",
  label: "TikTok",
  brandColor: "#000000",
  usesPKCE: false,
  isConfigured: () => !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET),
  buildAuthUrl: ({ redirectUri, state }) => {
    const params = new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY || "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "user.info.basic,video.publish,video.upload",
      state,
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  },
  exchangeCode: async ({ code, redirectUri }) => {
    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY || "",
        client_secret: process.env.TIKTOK_CLIENT_SECRET || "",
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error_description || data.error?.message || "TikTok token exchange failed");
    return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresInSeconds: data.expires_in };
  },
  fetchProfile: async (accessToken) => {
    const res = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,follower_count", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok || (data.error && data.error.code !== "ok")) throw new Error(data.error?.message || "Failed to fetch TikTok profile");
    const user = data.data?.user;
    if (!user) throw new Error("No TikTok user info returned.");
    return {
      externalId: user.open_id,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      accountKind: "profile",
      metadata: { followers: user.follower_count },
    };
  },
};

export const SOCIAL_PROVIDERS: Record<SocialPlatform, SocialProviderConfig> = {
  facebook,
  instagram,
  youtube,
  x,
  linkedin,
  tiktok,
};

export const SOCIAL_PLATFORMS: SocialPlatform[] = ["facebook", "instagram", "youtube", "x", "linkedin", "tiktok"];
