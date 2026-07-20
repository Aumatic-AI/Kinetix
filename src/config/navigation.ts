import {
  LayoutDashboard,
  Megaphone,
  Mail,
  Send,
  Mic,
  Share2,
  Settings,
  BarChart,
  Users,
  BookOpen,
  Link,
  CreditCard,
  Bot,
  Wand2,
  PlayCircle,
  FileText,
} from "lucide-react";
import { NavItem, ProductModule } from "@/types";
import { ROUTES } from "./routes";

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: ROUTES.DASHBOARD.HOME,
    icon: LayoutDashboard,
    module: "dashboard",
  },
  {
    id: "metaAds",
    label: "Meta Ads",
    href: ROUTES.META_ADS.DASHBOARD,
    icon: Megaphone,
    module: "metaAds",
  },
  {
    id: "social",
    label: "Social Media",
    href: ROUTES.SOCIAL.POSTS,
    icon: Share2,
    module: "social",
  },
  {
    id: "newsletter",
    label: "Newsletter",
    href: ROUTES.NEWSLETTER.DASHBOARD,
    icon: Mail,
    module: "newsletter",
  },
  {
    id: "outreach",
    label: "Outreach",
    href: ROUTES.OUTREACH.DASHBOARD,
    icon: Send,
    module: "outreach",
  },
  {
    id: "voice",
    label: "Voice Agents",
    href: ROUTES.VOICE.OVERVIEW,
    icon: Mic,
    module: "voice",
  },
  {
    id: "settings",
    label: "Settings",
    href: ROUTES.SETTINGS.WORKSPACE,
    icon: Settings,
    module: "settings",
  },
];

export const SECONDARY_NAV_ITEMS: Record<
  ProductModule,
  Omit<NavItem, "module">[]
> = {
  dashboard: [],
  metaAds: [
    {
      id: "ma-dashboard",
      label: "Dashboard",
      href: ROUTES.META_ADS.DASHBOARD,
      icon: LayoutDashboard,
    },
    {
      id: "ma-library",
      label: "Ad Library",
      href: ROUTES.META_ADS.AD_LIBRARY,
      icon: BookOpen,
    },
    {
      id: "ma-campaigns",
      label: "Campaigns",
      href: ROUTES.META_ADS.CAMPAIGNS,
      icon: PlayCircle,
    },
    {
      id: "ma-reports",
      label: "Reports",
      href: ROUTES.META_ADS.REPORTS,
      icon: FileText,
    },
    {
      id: "ma-leads",
      label: "Lead Responses",
      href: ROUTES.META_ADS.LEADS,
      icon: Users,
    },
    {
      id: "ma-account",
      label: "Ad Account",
      href: ROUTES.META_ADS.AD_ACCOUNT,
      icon: Link,
    },
  ],
  newsletter: [
    {
      id: "nl-dashboard",
      label: "Dashboard",
      href: ROUTES.NEWSLETTER.DASHBOARD,
      icon: LayoutDashboard,
    },
    {
      id: "nl-compose",
      label: "Compose",
      href: ROUTES.NEWSLETTER.COMPOSE,
      icon: Wand2,
    },
    {
      id: "nl-campaigns",
      label: "Campaigns",
      href: ROUTES.NEWSLETTER.CAMPAIGNS,
      icon: Megaphone,
    },
    {
      id: "nl-subscribers",
      label: "Subscribers",
      href: ROUTES.NEWSLETTER.SUBSCRIBERS,
      icon: Users,
    },
  ],
  outreach: [
    {
      id: "or-dashboard",
      label: "Dashboard",
      href: ROUTES.OUTREACH.DASHBOARD,
      icon: LayoutDashboard,
    },
    {
      id: "or-leads",
      label: "Leads",
      href: ROUTES.OUTREACH.LEADS,
      icon: Users,
    },
    {
      id: "or-campaigns",
      label: "Campaigns",
      href: ROUTES.OUTREACH.CAMPAIGNS,
      icon: Megaphone,
    },
  ],
  voice: [
    {
      id: "va-overview",
      label: "Overview",
      href: ROUTES.VOICE.OVERVIEW,
      icon: LayoutDashboard,
    },
    { id: "va-agents", label: "Agents", href: ROUTES.VOICE.AGENTS, icon: Bot },
    {
      id: "va-kb",
      label: "Knowledge Base",
      href: ROUTES.VOICE.KNOWLEDGE_BASE,
      icon: BookOpen,
    },
    { id: "va-calls", label: "Calls", href: ROUTES.VOICE.CALLS, icon: Mic },
    {
      id: "va-analytics",
      label: "Analytics",
      href: ROUTES.VOICE.ANALYTICS,
      icon: BarChart,
    },
  ],
  social: [
    {
      id: "sm-posts",
      label: "Posts",
      href: ROUTES.SOCIAL.POSTS,
      icon: Megaphone,
    },
    {
      id: "sm-accounts",
      label: "Connected Accounts",
      href: ROUTES.SOCIAL.CONNECTED_ACCOUNTS,
      icon: Link,
    },
  ],
  settings: [
    {
      id: "st-workspace",
      label: "Workspace",
      href: ROUTES.SETTINGS.WORKSPACE,
      icon: LayoutDashboard,
    },
    {
      id: "st-users",
      label: "Users",
      href: ROUTES.SETTINGS.USERS,
      icon: Users,
    },
    {
      id: "st-accounts",
      label: "Connected Accounts",
      href: ROUTES.SETTINGS.CONNECTED_ACCOUNTS,
      icon: Link,
    },
    {
      id: "st-providers",
      label: "AI Providers",
      href: ROUTES.SETTINGS.AI_PROVIDERS,
      icon: Bot,
    },
    {
      id: "st-billing",
      label: "Billing",
      href: ROUTES.SETTINGS.BILLING,
      icon: CreditCard,
    },
  ],
};
