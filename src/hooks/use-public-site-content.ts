import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch site_content for public-facing pages.
 * No auth required — reads rows where company_id IS NULL (global defaults).
 * Returns a flat map keyed by "section.key" for easy access.
 */
export function usePublicSiteContent() {
  return useQuery<Record<string, unknown>>({
    queryKey: ["public-site-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select("section, key, value")
        .is("company_id", null);

      if (error) throw error;

      const map: Record<string, unknown> = {};
      for (const row of (data ?? []) as { section: string; key: string; value: unknown }[]) {
        map[`${row.section}.${row.key}`] = row.value;
      }
      return map;
    },
    staleTime: 5 * 60_000,
  });
}

/**
 * Get a value from the site content map with a fallback.
 */
export function getPublicContentValue(
  content: Record<string, unknown> | undefined,
  section: string,
  key: string,
  fallback: unknown = ""
): unknown {
  return content?.[`${section}.${key}`] ?? fallback;
}
