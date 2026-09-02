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

/**
 * Fetch all site content, optionally filtered by company.
 * Returns a flat map keyed by "section.key" for easy access.
 */
export function useSiteContent(companyId?: string | null) {
  return useQuery<Record<string, unknown>>({
    queryKey: ["site-content", companyId],
    queryFn: async () => {
      let query = db.from("site_content").select("section, key, value") as any;
      if (companyId) {
        query = query.or(`company_id.eq.${companyId},company_id.is.null`);
      } else {
        query = query.is("company_id", null);
      }
      const { data, error } = await query;
      if (error) throw error;

      const map: Record<string, unknown> = {};
      for (const row of (data ?? []) as any[]) {
        map[`${row.section}.${row.key}`] = row.value;
      }
      return map;
    },
    staleTime: 5 * 60_000, // 5 minutes
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
  return content?.[`${section}.${key}`] ?? fallback;
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
      const { error } = await db.from("site_content").upsert(
        {
          section,
          key,
          value: JSON.stringify(value),
          company_id: companyId ?? null,
        },
        { onConflict: "section,key,company_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-content"] });
      qc.invalidateQueries({ queryKey: ["site-content-section"] });
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
