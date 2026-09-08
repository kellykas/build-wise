// Final data migration to the NEW project:
//  1. supabase_migrations history (best-effort, matches old project)
//  2. company row (needed as FK target for company-scoped CMS rows)
//  3. site_content: upsert all 43 extracted rows (40 global + 3 company-scoped)
//  4. auth.users + auth.identities (3 users, bcrypt password hashes preserved)
//  5. documents bucket config matched to old project
//  6. verification summary
// SECURITY: token read from /tmp/sb_token, never printed.
import { readFileSync } from "node:fs";

const NEW_REF = "hslpfgwmbvxkliszpbtx";
const token = readFileSync("/tmp/sb_token", "utf8").trim();
const API = `https://api.supabase.com/v1/projects/${NEW_REF}/database/query`;
const COMPANY_ID = "844d7edc-d592-40b0-a5b7-d23fea7d6183";

async function runSql(query: string): Promise<any> {
  const res = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  let body: any;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) {
    const msg = typeof body === "string" ? body : body?.error?.message ?? body?.message ?? JSON.stringify(body);
    throw new Error(`${res.status}: ${String(msg).slice(0, 400)}`);
  }
  return body;
}

function q(s: string): string {
  return s.replace(/'/g, "''");
}

function jsonLit(v: unknown): string {
  return `$JSON$${JSON.stringify(v)}$JSON$::jsonb`;
}

/** Normalize double-encoded JSON strings (e.g. '"[{...}]"' -> real JSON). */
function normalizeValue(v: unknown): unknown {
  if (typeof v === "string") {
    const t = v.trim();
    if ((t.startsWith('"') && t.endsWith('"')) || t.startsWith("[") || t.startsWith("{")) {
      try { return JSON.parse(t); } catch { return v; }
    }
  }
  return v;
}

// --- 1. supabase_migrations history (best-effort) ---
try {
  await runSql(`CREATE SCHEMA IF NOT EXISTS supabase_migrations;
    CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
      version text NOT NULL PRIMARY KEY,
      statements jsonb NOT NULL DEFAULT '[]'::jsonb,
      name text NOT NULL DEFAULT ''
    );`);
  const { readdirSync } = await import("node:fs");
  const files = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const version = f.replace(/\.sql$/, "").split("_")[0];
    const name = f.replace(/\.sql$/, "").split("_").slice(1).join("_");
    await runSql(
      `INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('${version}', '${q(name)}') ON CONFLICT (version) DO NOTHING;`
    );
  }
  const hist = await runSql(`SELECT count(*)::int AS n FROM supabase_migrations.schema_migrations;`);
  console.log("Migration history rows recorded:", JSON.stringify(hist));
} catch (e) {
  console.log("Migration history skipped:", String((e as Error).message).slice(0, 150));
}

// --- 2. Company row (FK target for company-scoped CMS rows) ---
await runSql(
  `INSERT INTO public.companies (id, name) VALUES ('${COMPANY_ID}', 'Scer-L/Construct Sarl')
   ON CONFLICT (id) DO NOTHING;`
);
console.log("Company row ensured.");

// --- 3. CMS rows ---
const raw = JSON.parse(readFileSync("/tmp/migration/site-content.json", "utf8")) as any[];
const dedup = new Map<string, any>();
for (const r of raw) dedup.set(`${r.section}\u0000${r.key}\u0000${r.company_id ?? ""}`, r);
const rows = [...dedup.values()];
const globalRows = rows.filter((r) => !r.company_id);
const scopedRows = rows.filter((r) => r.company_id);
console.log(`CMS rows: ${rows.length} total (${globalRows.length} global, ${scopedRows.length} company-scoped)`);

if (globalRows.length) {
  const values = globalRows.map((r) => {
    const value = normalizeValue(r.value);
    return `('${q(r.section)}', '${q(r.key)}', $JSON$${JSON.stringify(value)}$JSON$::jsonb)`;
  });
  await runSql(`
    INSERT INTO public.site_content (section, key, value)
    VALUES ${values.join(",\n  ")}
    ON CONFLICT (section, key) WHERE company_id IS NULL
    DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  `);
  console.log(`Upserted ${globalRows.length} global rows.`);
}
if (scopedRows.length) {
  const values = scopedRows.map((r) => {
    const value = normalizeValue(r.value);
    return `('${q(r.section)}', '${q(r.key)}', $JSON$${JSON.stringify(value)}$JSON$::jsonb, '${r.company_id}')`;
  });
  await runSql(`
    INSERT INTO public.site_content (section, key, value, company_id)
    VALUES ${values.join(",\n  ")}
    ON CONFLICT (section, key, company_id)
    DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  `);
  console.log(`Upserted ${scopedRows.length} company-scoped rows.`);
}

// --- 4. Auth users + identities ---
const auth = JSON.parse(readFileSync("/tmp/migration/auth-users.json", "utf8")) as {
  users: any[]; identities: any[];
};

const userValues = auth.users.map((u) => {
  return [
    "('00000000-0000-0000-0000-000000000000'", // instance_id
    `'${u.id}'`,
    `'${q(u.aud ?? "authenticated")}'`,
    `'${q(u.role ?? "authenticated")}'`,
    `'${q(u.email)}'`,
    `'${q(u.encrypted_password)}'`,
    u.email_confirmed_at ? `'${u.email_confirmed_at}'` : "NULL",
    u.confirmation_sent_at ? `'${u.confirmation_sent_at}'` : "NULL",
    `'${u.created_at}'`,
    `'${u.updated_at}'`,
    u.last_sign_in_at ? `'${u.last_sign_in_at}'` : "NULL",
    jsonLit(u.raw_app_meta_data),
    jsonLit(u.raw_user_meta_data),
    "false, false)", // is_sso_user, is_anonymous
  ].join(", ");
});

const res = await runSql(`
  INSERT INTO auth.users
    (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
     confirmation_sent_at, created_at, updated_at, last_sign_in_at,
     raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
  VALUES ${userValues}
  ON CONFLICT (id) DO NOTHING
  RETURNING id, email;
`);
console.log("Inserted users:", JSON.stringify(res));

const idValues = auth.identities.map((i) => [
  `('${i.id}'`,
  `'${i.user_id}'`,
  `'${q(i.provider)}'`,
  `'${q(i.provider_id)}'`,
  jsonLit(i.identity_data),
  i.last_sign_in_at ? `'${i.last_sign_in_at}'` : "NULL",
  `'${i.created_at}'`,
  `'${i.updated_at}')`,
].join(", "));

const res2 = await runSql(`
  INSERT INTO auth.identities
    (id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES ${idValues}
  ON CONFLICT (provider_id, provider) DO NOTHING
  RETURNING id, user_id;
`);
console.log("Inserted identities:", JSON.stringify(res2));

// --- 5. Bucket config matched to old project (no size limit, no mime restriction) ---
await runSql(
  `UPDATE storage.buckets SET file_size_limit = NULL, allowed_mime_types = NULL WHERE id = 'documents';`
);
console.log("Bucket config updated.");

// --- 6. Verification ---
console.log("\n=== VERIFY ===");
const tables = await runSql(
  `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1;`
);
console.log("public tables:", tables.map((t: any) => t.table_name).join(", "));

const users = await runSql(`SELECT id, email, email_confirmed_at IS NOT NULL AS confirmed FROM auth.users ORDER BY created_at;`);
console.log("auth.users:", JSON.stringify(users));

const profiles = await runSql(`SELECT id, full_name, email, company_id FROM public.profiles ORDER BY created_at;`);
console.log("profiles (trigger-created):", JSON.stringify(profiles));

const roles = await runSql(`SELECT ur.user_id, u.email, ur.role, ur.company_id FROM public.user_roles ur JOIN auth.users u ON u.id = ur.user_id;`);
console.log("user_roles:", JSON.stringify(roles));

const cms = await runSql(
  `SELECT count(*) FILTER (WHERE company_id IS NULL)::int AS global, count(*) FILTER (WHERE company_id IS NOT NULL)::int AS scoped, count(*)::int AS total FROM public.site_content;`
);
console.log("site_content:", JSON.stringify(cms));

const bucket = await runSql(`SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id='documents';`);
console.log("documents bucket:", JSON.stringify(bucket));

const company = await runSql(`SELECT id, name FROM public.companies;`);
console.log("companies:", JSON.stringify(company));

console.log("\nFinalize done.");
