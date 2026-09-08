import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Cast supabase client to allow the site_content table (not yet in generated types)
const db = supabase as unknown as {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

export type SiteContentRow = {
  id: string;
  section: string;
  key: string;
  value: unknown;
  company_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Undo accidental double JSON encoding from older saves. */
function normalize(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      trimmed.startsWith("[") ||
      trimmed.startsWith("{")
    ) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return value;
      }
    }
  }
  return value;
}

/**
 * Fetch all site content, optionally filtered by company.
 * Returns a flat map keyed by "section.key". Company-specific rows
 * override the global (company_id null) defaults.
 */
export function useSiteContent(companyId?: string | null) {
  return useQuery<Record<string, unknown>>({
    queryKey: ["site-content", companyId ?? null],
    queryFn: async () => {
      let query = db.from("site_content").select("section, key, value, company_id") as any;
      if (companyId) {
        // Authenticated workspace: this company's rows + global defaults.
        query = query.or(`company_id.eq.${companyId},company_id.is.null`);
      }
      // Public pages (no companyId): read every row so company-scoped CMS
      // edits are visible — company rows override the global defaults below.
      const { data, error } = await query;
      if (error) throw error;

      const rows = (data ?? []) as any[];
      // global rows first, company rows last so they win
      rows.sort((a, b) => (a.company_id ? 1 : 0) - (b.company_id ? 1 : 0));

      const map: Record<string, unknown> = {};
      for (const row of rows) {
        map[`${row.section}.${row.key}`] = normalize(row.value);
      }
      return map;
    },
    staleTime: 30_000,
  });
}

/**
 * Convenience accessor: get a single value by section.key with a fallback.
 */
export function getContentValue(
  content: Record<string, unknown> | undefined,
  section: string,
  key: string,
  fallback: unknown = ""
): unknown {
  const v = content?.[`${section}.${key}`];
  if (v === undefined || v === null || v === "") return fallback;
  return v;
}

/** String accessor with fallback. */
export function siteText(
  content: Record<string, unknown> | undefined,
  section: string,
  key: string,
  fallback: string
): string {
  const v = getContentValue(content, section, key, fallback);
  return typeof v === "string" ? v : fallback;
}

/** Array accessor with fallback. */
export function siteList<T>(
  content: Record<string, unknown> | undefined,
  section: string,
  key: string,
  fallback: T[]
): T[] {
  const v = getContentValue(content, section, key, fallback);
  return Array.isArray(v) && v.length > 0 ? (v as T[]) : fallback;
}

/**
 * Fetch raw rows for a specific section (for the admin editor).
 */
export function useSiteContentSection(section: string) {
  return useQuery<SiteContentRow[]>({
    queryKey: ["site-content-section", section],
    queryFn: async () => {
      const { data, error } = await db
        .from("site_content")
        .select("*")
        .eq("section", section)
        .order("key") as any;
      if (error) throw error;
      return (data ?? []) as SiteContentRow[];
    },
  });
}

/**
 * Upsert a single site content value.
 * All content is stored globally (company_id null) so the public website,
 * which is read by anonymous visitors, always picks up the edits.
 */
export function useUpsertSiteContent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      section,
      key,
      value,
      companyId,
    }: {
      section: string;
      key: string;
      value: unknown;
      companyId?: string | null;
    }) => {
      const upsertScope = async (scopeCompanyId: string | null) => {
        let existing;
        if (scopeCompanyId) {
          existing = await (db
            .from("site_content")
            .select("id")
            .eq("section", section)
            .eq("key", key)
            .eq("company_id", scopeCompanyId)
            .maybeSingle() as any);
        } else {
          existing = await (db
            .from("site_content")
            .select("id")
            .eq("section", section)
            .eq("key", key)
            .is("company_id", null)
            .maybeSingle() as any);
        }
        if (existing.error) throw existing.error;

        if (existing.data?.id) {
          const { error } = await (db
            .from("site_content")
            .update({ value, updated_at: new Date().toISOString() })
            .eq("id", existing.data.id) as any);
          if (error) throw error;
        } else {
          const { error } = await (db
            .from("site_content")
            .insert({ section, key, value, company_id: scopeCompanyId }) as any);
          if (error) throw error;
        }
      };

      // Always keep the global default in sync, and also the company-scoped
      // row (when editing from a company workspace) — readers that prefer the
      // company row (admin editor + public site) must see the same value.
      await upsertScope(null);
      if (companyId) await upsertScope(companyId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-content"] });
      qc.invalidateQueries({ queryKey: ["site-content-section"] });
      // Public pages use a different cache key; refresh them too so edits
      // are visible immediately without waiting for the stale window.
      qc.invalidateQueries({ queryKey: ["public-site-content"] });
    },
  });
}

/**
 * Delete a site content entry.
 */
export function useDeleteSiteContent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await db.from("site_content").delete().eq("id", id) as any;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-content"] });
      qc.invalidateQueries({ queryKey: ["site-content-section"] });
      qc.invalidateQueries({ queryKey: ["public-site-content"] });
    },
  });
}

/**
 * Fetch all sections list for the admin sidebar.
 */
export function useSiteContentSections() {
  return useQuery<string[]>({
    queryKey: ["site-content-sections"],
    queryFn: async () => {
      const { data, error } = await db
        .from("site_content")
        .select("section")
        .order("section") as any;
      if (error) throw error;
      const sections = [...new Set((data ?? []).map((r: any) => r.section))] as string[];
      return sections;
    },
  });
}
