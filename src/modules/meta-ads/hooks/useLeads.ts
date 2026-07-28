import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Lead {
  id: string;
  created_at: string;
  meta_lead_id: string;
  meta_form_id: string | null;
  ad_id: string | null;
  ad_name: string | null;
  adset_name: string | null;
  campaign_name: string | null;
  field_data: Record<string, string>;
}

export interface LeadFormQuestion {
  type: string;
  label?: string;
}

export interface LeadFormThankYouPage {
  title?: string;
  body?: string;
  button_type?: string;
  website_url?: string;
  button_text?: string;
}

export interface LeadFormContextCard {
  title?: string;
  content?: string[];
  button_text?: string;
}

/** Everything Meta actually has on record for one Instant Form — fetched
 * live, every field Kinetix's create flow can set (see CreateLeadFormInput
 * below), so the View/List UI never shows less than what was configured. */
export interface LeadForm {
  id: string;
  name: string;
  status: string;
  locale?: string;
  leads_count?: number;
  created_time?: string;
  questions?: LeadFormQuestion[];
  privacy_policy_url?: string;
  is_optimized_for_quality?: boolean;
  context_card?: LeadFormContextCard;
  thank_you_page?: LeadFormThankYouPage;
}

/** Every field the "New Instant Form" modal collects, mapped 1:1 to what
 * POST /api/meta-ads/lead-forms sends Meta. Deliberately leaves out
 * question_page_custom_disclaimer — Meta's format for it is the least
 * documented/most failure-prone part of this API, and the privacy_policy
 * link already covers the compliance need for the vast majority of forms. */
export interface CreateLeadFormInput {
  name: string;
  standardQuestions: string[];
  customQuestions: string[];
  privacyPolicyUrl: string;
  privacyPolicyLinkText: string;
  locale: string;
  contextCardEnabled: boolean;
  contextCardTitle?: string;
  contextCardContent?: string;
  contextCardButtonText?: string;
  thankYouButtonType: "VIEW_WEBSITE" | "NONE";
  thankYouTitle?: string;
  thankYouBody?: string;
  thankYouWebsiteUrl?: string;
  thankYouButtonText?: string;
  isOptimizedForQuality: boolean;
}

export const leadsKeys = {
  all: ["leads"] as const,
  list: () => [...leadsKeys.all, "list"] as const,
  forms: () => [...leadsKeys.all, "forms"] as const,
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

/** Reads straight from our own leads table — populated by the webhook in
 * real time, so unlike Campaigns/Reports there's no live Meta call here. */
export function useLeadsList() {
  return useQuery({
    queryKey: leadsKeys.list(),
    queryFn: () => fetchJson<{ leads: Lead[] }>("/api/meta-ads/leads").then((d) => d.leads),
  });
}

/** User-triggered only — backfills anything submitted before the webhook
 * was registered, or while it was down. Never called automatically. */
export function useSyncLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fetchJson<{ success: true; formsChecked: number; leadsImported: number }>("/api/meta-ads/leads/sync", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadsKeys.list() }),
  });
}

/** Instant Forms live entirely on Meta (see the API route's own comment) —
 * includes archived forms too, so a form can still be viewed after it's
 * archived instead of disappearing from the list entirely. */
export function useLeadForms() {
  return useQuery({
    queryKey: leadsKeys.forms(),
    queryFn: () => fetchJson<{ forms: LeadForm[] }>("/api/meta-ads/lead-forms").then((d) => d.forms),
    retry: false,
  });
}

export function useCreateLeadForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLeadFormInput) =>
      fetchJson("/api/meta-ads/lead-forms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadsKeys.forms() }),
  });
}

export function useArchiveLeadForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formId: string) => fetchJson(`/api/meta-ads/lead-forms?formId=${formId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadsKeys.forms() }),
  });
}
