// Extract all site_content rows (CMS content) from the OLD project.
// SECURITY: prints only row counts and section names, never key values.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / publishable key");
  process.exit(1);
}
const isNewKey = key.startsWith("sb_publishable_") || key.startsWith("sb_secret_");
const headers: Record<string, string> = { apikey: key };
if (!isNewKey) headers["Authorization"] = `Bearer ${key}`;

// Page through all rows (default max is 1000 per page)
const all: any[] = [];
let from = 0;
const pageSize = 1000;
for (;;) {
  const res = await fetch(`${url}/rest/v1/site_content?select=*&order=section.asc,key.asc`, {
    headers: { ...headers, Range: `${from}-${from + pageSize - 1}` },
  });
  if (!res.ok) {
    console.error("Fetch failed:", res.status, (await res.text()).slice(0, 200));
    process.exit(1);
  }
  const rows = (await res.json()) as any[];
  all.push(...rows);
  if (rows.length < pageSize) break;
  from += pageSize;
}

console.log(`Extracted ${all.length} site_content rows`);
const bySection: Record<string, number> = {};
for (const r of all) bySection[`${r.section} · ${r.key}`] = (r.value === null ? "null" : typeof r.value);
for (const [k, v] of Object.entries(bySection).sort()) console.log(`  ${k} (${v})`);

await Bun.write("/tmp/migration/site-content.json", JSON.stringify(all, null, 2));
console.log("Saved to /tmp/migration/site-content.json");
