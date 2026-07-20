import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Contact, ContactFilters, ContactCategory, CategoryStatusBreakdown } from "../types/contacts.types";

export const contactsKeys = {
  all: ["contacts"] as const,
  list: (filters?: ContactFilters, page?: number) => [...contactsKeys.all, "list", filters, page] as const,
  categories: () => [...contactsKeys.all, "categories"] as const,
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function useContacts(filters?: ContactFilters, page = 1, limit = 50) {
  return useQuery({
    queryKey: contactsKeys.list(filters, page),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filters?.categoryId) params.set("categoryId", filters.categoryId);
      if (filters?.search) params.set("search", filters.search);
      if (filters?.subscriberStatus) params.set("subscriberStatus", filters.subscriberStatus);
      if (filters?.outreachStatus) params.set("outreachStatus", filters.outreachStatus);
      if (filters?.excludeOutreachStatuses?.length) params.set("excludeOutreachStatuses", filters.excludeOutreachStatuses.join(","));
      return fetchJson<{ contacts: Contact[]; count: number }>(`/api/contacts?${params.toString()}`);
    },
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; firstName?: string; lastName?: string; phone?: string; company?: string; categoryId?: string }) =>
      fetchJson("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contactsKeys.all }),
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; firstName?: string; lastName?: string; phone?: string; company?: string; categoryId?: string; subscriberStatus?: string; outreachStatus?: string }) =>
      fetchJson(`/api/contacts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contactsKeys.all }),
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson(`/api/contacts/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contactsKeys.all }),
  });
}

export interface ContactCategoryWithCount extends ContactCategory {
  contactCount: number;
  statusBreakdown: CategoryStatusBreakdown;
}

export function useContactCategories() {
  return useQuery({
    queryKey: contactsKeys.categories(),
    queryFn: () => fetchJson<{ categories: ContactCategoryWithCount[] }>("/api/contacts/categories").then((d) => d.categories),
    staleTime: 60 * 1000,
  });
}

export function useCreateContactCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => fetchJson("/api/contacts/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contactsKeys.categories() }),
  });
}

export function useRenameContactCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => fetchJson(`/api/contacts/categories/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contactsKeys.categories() }),
  });
}

export function useDeleteContactCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson(`/api/contacts/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contactsKeys.all }),
  });
}
