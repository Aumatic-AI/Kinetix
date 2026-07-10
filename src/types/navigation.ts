import { LucideIcon } from "lucide-react";

export type ProductModule = "dashboard" | "metaAds" | "newsletter" | "outreach" | "voice" | "social" | "settings";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  module: ProductModule;
}
