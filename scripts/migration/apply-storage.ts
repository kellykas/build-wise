// Create the documents storage bucket on the NEW project and print the
// project's publishable key so the app can be pointed at it.
// SECURITY: prints the publishable key only if it is a public-style key
// (sb_publishable_* / anon JWT). Never prints secret keys.
import { readFileSync } from "node:fs";

const NEW_REF = "hslpfgwmbvxkliszpbtx";
const token = readFileSync("/tmp/sb_token", "utf8").trim();
const API = `https://api.supabase.com/v1/projects/${NEW_REF}`;

async function runSql(query: string): Promise<any> {
  const res = await fetch(`${API}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`SQL failed (${res.status}):`, text.slice(0, 400));
    return null;
  }
  return JSON.parse(text);
}

// 1. Create the documents bucket (private, matches old project)
console.log("Creating documents bucket...");
const res = await runSql(`
  INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('documents', 'documents', false, 52428800)
  ON CONFLICT (id) DO NOTHING
  RETURNING id;
`);
console.log("Bucket result:", JSON.stringify(res));

// 2. Fetch API keys for the new project
console.log("\nFetching API keys...");
const keysRes = await fetch(`${API}/api-keys?reveal=true`, {
  headers: { Authorization: `Bearer ${token}` },
});
const keysText = await keysRes.text();
let keys: any = null;
try { keys = JSON.parse(keysText); } catch { keys = null; }

const publishableUrl = `https://${NEW_REF}.supabase.co`;

if (Array.isArray(keys)) {
  for (const k of keys) {
    const name = k.name ?? k.type ?? "key";
    const val: string = k.api_key ?? k.value ?? "";
    if (val.startsWith("sb_publishable_")) {
      console.log(`\nVITE_SUPABASE_URL=${publishableUrl}`);
      console.log(`VITE_SUPABASE_PUBLISHABLE_KEY=${val}`);
    } else if (val.startsWith("sb_secret_")) {
      console.log(`(secret key present: ${name} — not printed)`);
    } else {
      // Legacy JWT keys: anon key is safe to print (it ships in the client bundle)
      try {
        const payload = JSON.parse(Buffer.from(val.split(".")[1], "base64").toString());
        if (payload.role === "anon") {
          console.log(`\nVITE_SUPABASE_URL=${publishableUrl}`);
          console.log(`VITE_SUPABASE_PUBLISHABLE_KEY=${val}`);
        } else if (payload.role === "service_role") {
          console.log("(service_role JWT present — not printed)");
        }
      } catch {
        console.log(`(key present: ${name} — not printed)`);
      }
    }
  }
} else {
  console.log("Could not list keys:", keysText.slice(0, 300));
}

// 3. Also check auth config to mirror later
console.log("\nAuth config (old project mirror comes in phase 2):");
const cfgRes = await fetch(`${API}/config/auth`, { headers: { Authorization: `Bearer ${token}` } });
if (cfgRes.ok) {
  const cfg = await cfgRes.json();
  console.log("  Site URL:", cfg.site_url);
  console.log("  External providers enabled:", Object.entries(cfg.external ?? {})
    .filter(([, v]: any) => v?.enabled).map(([k]) => k).join(", ") || "(none)");
} else {
  console.log("  (could not read auth config:", cfgRes.status + ")");
}
