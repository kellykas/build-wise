// Phase 1 apply: create site_content + RLS on the NEW project and insert
// the extracted CMS rows. Uses the Supabase Management API query endpoint
// with the personal access token from /tmp/sb_token.
// SECURITY: token is read from /tmp/sb_token and never printed.
import { existsSync, readFileSync } from "node:fs";

const NEW_REF = "hslpfgwmbvxkliszpbtx";
const token = readFileSync("/tmp/sb_token", "utf8").trim();
const API = `https://api.supabase.com/v1/projects/${NEW_REF}/database/query`;

async function runSql(query: string): Promise<any> {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  let body: any;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) {
    console.error(`SQL failed (${res.status}):`, typeof body === "string" ? body.slice(0, 500) : JSON.stringify(body).slice(0, 500));
    console.error("Statement was:", query.slice(0, 300));
    process.exit(1);
  }
  return body;
}

function q(s: string): string {
  return s.replace(/'/g, "''");
}

/** Normalize double-encoded JSON strings (e.g. '"[{...}]"' -> [{...}]). */
function normalizeValue(v: unknown): unknown {
  if (typeof v === "string") {
    const t = v.trim();
    if ((t.startsWith('"') && t.endsWith('"')) || t.startsWith("[") || t.startsWith("{")) {
      try { return JSON.parse(t); } catch { return v; }
    }
  }
  return v;
}

// 1. Create the table
console.log("Creating site_content table...");
await runSql(`
  CREATE TABLE IF NOT EXISTS public.site_content (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    section text NOT NULL,
    key text NOT NULL,
    value jsonb,
    company_id uuid, -- FK to companies(id) will be added with the full schema in phase 2
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
`);

// 2. RLS + policies
console.log("Enabling RLS and creating policies...");
await runSql(`ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;`);
await runSql(`DROP POLICY IF EXISTS "Public can read global site content" ON public.site_content;`);
await runSql(`CREATE POLICY "Public can read global site content" ON public.site_content FOR SELECT TO anon, authenticated USING (company_id IS NULL);`);
await runSql(`DROP POLICY IF EXISTS "Authenticated users can manage site content" ON public.site_content;`);
await runSql(`CREATE POLICY "Authenticated users can manage site content" ON public.site_content FOR ALL TO authenticated USING (true) WITH CHECK (true);`);
await runSql(`CREATE UNIQUE INDEX IF NOT EXISTS site_content_section_key_global_idx ON public.site_content (section, key) WHERE company_id IS NULL;`);

// 3. Insert extracted rows
console.log("Loading extracted CMS rows...");
const raw = JSON.parse(readFileSync("/tmp/migration/site-content.json", "utf8")) as any[];
// Dedupe by section+key (old table has some duplicate rows) — keep the last one
const dedup = new Map<string, any>();
for (const r of raw) dedup.set(`${r.section}\u0000${r.key}`, r);
const rows = [...dedup.values()];
console.log(`Deduped ${raw.length} -> ${rows.length} rows`);
const values = rows.map((r) => {
  const value = normalizeValue(r.value);
  const jsonText = JSON.stringify(value);
  return `('${q(r.section)}', '${q(r.key)}', $JSON$${jsonText}$JSON$::jsonb)`;
});
await runSql(`
  INSERT INTO public.site_content (section, key, value)
  VALUES ${values.join(",\n  ")}
  ON CONFLICT (section, key) WHERE company_id IS NULL
  DO UPDATE SET value = EXCLUDED.value, updated_at = now();
`);
console.log(`Inserted/updated ${rows.length} rows.`);

// 4. Verify
const count = await runSql(`SELECT count(*)::int AS n FROM public.site_content;`);
console.log("Row count on new project:", JSON.stringify(count));
const check = await runSql(`SELECT section, key, jsonb_typeof(value) AS vtype FROM public.site_content ORDER BY section, key;`);
for (const row of check) console.log(`  ${row.section} · ${row.key} (${row.vtype})`);

console.log("Done: site_content migrated to new project.");
