// Fetch the PostgREST OpenAPI spec from the OLD (Lovable) project to learn
// the public schema structure. Reads SUPABASE_URL + publishable key from env.
// SECURITY: never prints key values — only the project ref (public by design,
// it appears in the client bundle shipped to every visitor).
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / publishable key in runtime env");
  process.exit(1);
}
const ref = url.replace(/^https?:\/\//, "").split(".")[0];
console.log("Old project ref:", ref);
const isNewKey = key.startsWith("sb_publishable_") || key.startsWith("sb_secret_");
const headers: Record<string, string> = { apikey: key };
if (!isNewKey) headers["Authorization"] = `Bearer ${key}`;
const res = await fetch(`${url}/rest/v1/`, { headers });
console.log("Status:", res.status);
const text = await res.text();
console.log("Body head:", text.slice(0, 400));
let spec: any = {};
try { spec = JSON.parse(text); } catch {}
const defs = spec?.definitions ?? spec?.components?.schemas ?? {};
const tables = Object.keys(defs).sort();
console.log(`Exposed tables/views (${tables.length}):`);
for (const t of tables) console.log(" -", t);
await Bun.write("/tmp/migration/old-openapi.json", JSON.stringify(spec, null, 2));
console.log("Saved spec to /tmp/migration/old-openapi.json");
