import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Undo accidental double JSON encoding from older saves (same as admin hook). */
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
 * Fetch site_content for public-facing pages.
 * No auth required — reads all rows. Company-specific rows override global defaults.
 * Returns a flat map keyed by "section.key" for easy access.
 *
 * Uses the same anon Supabase client as useSiteContent (which is proven to
 * work at SSR on the home page). The site_content table has a public read
 * policy, so the anon key can read it.
 */
export function usePublicSiteContent() {
  return useQuery<Record<string, unknown>>({
    queryKey: ["public-site-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select("section, key, value, company_id");

      if (error) throw error;

      const rows = (data ?? []) as { section: string; key: string; value: unknown; company_id: string | null }[];
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
