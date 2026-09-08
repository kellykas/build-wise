// Probe REST data endpoints on the OLD project with the publishable (anon) key.
// SECURITY: prints only status codes and row counts, never key values.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / publishable key");
  process.exit(1);
}
const isNewKey = key.startsWith("sb_publishable_") || key.startsWith("sb_secret_");
const headers: Record<string, string> = { apikey: key };
if (!isNewKey) headers["Authorization"] = `Bearer ${key}`;

const candidates = [
  "site_content",
  "profiles",
  "services",
  "projects",
  "milestones",
  "leadership",
  "documents",
  "companies",
  "clients",
  "employees",
  "invoices",
  "audit_logs",
];

for (const table of candidates) {
  try {
    const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
      headers: { ...headers, Range: "0-0", Prefer: "count=exact" },
    });
    const cr = res.headers.get("content-range"); // e.g. "0-0/123"
    const count = cr?.split("/")[1] ?? "?";
    const body = res.ok ? "" : ` :: ${(await res.text()).slice(0, 120)}`;
    console.log(`${table.padEnd(16)} ${res.status}  rows≈${count}${body}`);
  } catch (e) {
    console.log(`${table.padEnd(16)} ERR ${(e as Error).message}`);
  }
}
