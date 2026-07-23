export const ROUTES = {
  AUTH: {
    LOGIN: "/login",
    SIGNUP: "/signup",
  },
  DASHBOARD: {
    HOME: "/dashboard",
  },
  META_ADS: {
    DASHBOARD: "/meta-ads",
    AD_ACCOUNT: "/meta-ads/account",
    AD_LIBRARY: "/meta-ads/ad-library",
    CAMPAIGNS: "/meta-ads/campaigns",
    REPORTS: "/meta-ads/reports",
    LEADS: "/meta-ads/leads",
  },
  NEWSLETTER: {
    DASHBOARD: "/newsletter",
  },
  OUTREACH: {
    DASHBOARD: "/outreach",
    LEADS: "/outreach/leads",
    CAMPAIGNS: "/outreach/campaigns",
    CAMPAIGN_NEW: "/outreach/campaigns/new",
    CAMPAIGN_DETAIL: (id: string) => `/outreach/campaigns/${id}`,
  },
  VOICE: {
    OVERVIEW: "/voice",
    AGENTS: "/voice/agents",
    KNOWLEDGE_BASE: "/voice/knowledge-base",
    CALLS: "/voice/calls",
    ANALYTICS: "/voice/analytics",
  },
  SOCIAL: {
    CONNECTED_ACCOUNTS: "/social/connected-accounts",
    POSTS: "/social/posts",
    POSTS_PUBLISH: "/social/posts/publish",
  },
  SETTINGS: {
    WORKSPACE: "/settings/workspace",
    USERS: "/settings/users",
    CONNECTED_ACCOUNTS: "/settings/connected-accounts",
    AI_PROVIDERS: "/settings/ai-providers",
    BILLING: "/settings/billing",
  },
} as const;
