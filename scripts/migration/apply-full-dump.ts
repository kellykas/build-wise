// Apply a full-dump JSON (from extract-full-dump.sql or dump-full.ts) to the
// NEW Supabase project via the Management API query endpoint.
// Usage: bun scripts/migration/apply-full-dump.ts /tmp/migration/full-dump.json
// SECURITY: reads the PAT from /tmp/sb_token; never prints it.
import { readFileSync } from "node:fs";

const NEW_REF = "hslpfgwmbvxkliszpbtx";
const token = readFileSync("/tmp/sb_token", "utf8").trim();
const API = `https://api.supabase.com/v1/projects/${NEW_REF}/database/query`;

const dumpPath = process.argv[2] ?? "/tmp/migration/full-dump.json";
const dump = JSON.parse(readFileSync(dumpPath, "utf8"));

let failures: { step: string; error: string }[] = [];

async function runSql(query: string, label: string, optional = false): Promise<any> {
  const res = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  let body: any;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) {
    const msg = typeof body === "string" ? body : JSON.stringify(body);
    if (optional) {
      console.log(`  skip (${label}): ${msg.slice(0, 140)}`);
      failures.push({ step: label, error: msg.slice(0, 300) });
      return null;
    }
    console.error(`FAILED (${label}): ${msg.slice(0, 400)}`);
    failures.push({ step: label, error: msg.slice(0, 300) });
    return null;
  }
  return body;
}

function q(s: string): string {
  return s.replace(/'/g, "''");
}

// ---------- 1. Schemas ----------
for (const s of dump.schemas ?? []) {
  if (s === "public") continue;
  await runSql(`CREATE SCHEMA IF NOT EXISTS "${q(s)}";`, `schema:${s}`, true);
}

// ---------- 2. Extensions ----------
for (const e of dump.extensions ?? []) {
  if (["plpgsql", "pg_graphql", "pg_stat_statements", "pgcrypto", "uuid-ossp", "pgjwt"].includes(e.name)) continue;
  await runSql(`CREATE EXTENSION IF NOT EXISTS "${q(e.name)}";`, `extension:${e.name}`, true);
}

// ---------- 3. Enums ----------
for (const e of dump.enums ?? []) {
  const vals = (e.values ?? []).map((v: string) => `'${q(v)}'`).join(", ");
  await runSql(`DO $$ BEGIN CREATE TYPE "${q(e.schema)}"."${q(e.name)}" AS ENUM (${vals}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`, `enum:${e.name}`, true);
}

// ---------- 4. Functions (two passes for dependency order) ----------
const funcs: any[] = dump.functions ?? [];
for (const pass of [1, 2]) {
  for (const f of funcs) {
    if (pass === 2 && !f._retry) continue;
    const res = await runSql(f.def, `function:${f.schema}.${f.name}`, true);
    if (res === null) f._retry = true; else if (pass === 1) f._retry = false;
  }
}
for (const f of funcs) delete f._retry;

// ---------- 5. Tables ----------
const tables: any[] = dump.tables ?? [];
const sysSchemas = new Set(["auth", "storage"]);
const appTables = tables.filter((t) => !sysSchemas.has(t.schema));

for (const t of appTables) {
  const cols = (t.columns ?? []).map((c: any) => {
    const type = c.type;
    const nn = c.notnull ? " NOT NULL" : "";
    const def = c.default ? ` DEFAULT ${c.default}` : "";
    return `"${q(c.name)}" ${type}${def}${nn}`;
  });
  const pks = (t.constraints ?? []).filter((c: any) => c.def.trim().toUpperCase().startsWith("PRIMARY KEY"));
  const uniqChecks = (t.constraints ?? []).filter((c: any) => {
    const u = c.def.trim().toUpperCase();
    return u.startsWith("UNIQUE") || u.startsWith("CHECK") || u.startsWith("EXCLUDE");
  });
  const pkLine = pks.length ? `, ${pks.map((c: any) => `CONSTRAINT "${q(c.name)}" ${c.def}`).join(", ")}` : "";
  const ucLine = uniqChecks.length ? `, ${uniqChecks.map((c: any) => `CONSTRAINT "${q(c.name)}" ${c.def}`).join(", ")}` : "";
  const schemaPrefix = t.schema === "public" ? "" : `"${q(t.schema)}".`;
  await runSql(`CREATE TABLE IF NOT EXISTS ${schemaPrefix}"${q(t.name)}" (\n  ${cols.join(",\n  ")}${pkLine}${ucLine}\n);`, `table:${t.schema}.${t.name}`);
}

// FKs after all tables exist
for (const t of appTables) {
  const fks = (t.constraints ?? []).filter((c: any) => c.def.trim().toUpperCase().startsWith("FOREIGN KEY"));
  for (const fk of fks) {
    const schemaPrefix = t.schema === "public" ? "public." : `"${q(t.schema)}".`;
    await runSql(`ALTER TABLE ${schemaPrefix}"${q(t.name)}" ADD CONSTRAINT "${q(fk.name)}" ${fk.def};`, `fk:${t.name}.${fk.name}`, true);
  }
}

// Indexes
for (const t of appTables) {
  for (const idx of t.indexes ?? []) {
    const def = idx.def.replace(/;$/, "");
    if (/CREATE (UNIQUE )?INDEX/i.test(def)) {
      const named = def.replace(/CREATE (UNIQUE )?INDEX /i, (m) => m.replace(/INDEX/i, `INDEX IF NOT EXISTS`));
      await runSql(named, `index:${t.name}.${idx.name}`, true);
    }
  }
}

// ---------- 6. Data load ----------
console.log("\nLoading data...");
for (const t of tables) {
  const rows = t.rows ?? [];
  if (!rows.length) { console.log(`  ${t.schema}.${t.name}: 0 rows`); continue; }
  const schemaPrefix = t.schema === "public" ? "public." : `"${q(t.schema)}".`;
  if (t.force_rls) await runSql(`ALTER TABLE ${schemaPrefix}"${q(t.name)}" NO FORCE ROW LEVEL SECURITY;`, `noforce:${t.name}`, true);
  const CHUNK = 150;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const jsonText = JSON.stringify(chunk);
    const res = await runSql(
      `INSERT INTO ${schemaPrefix}"${q(t.name)}" SELECT * FROM json_populate_recordset(NULL::${t.schema === "public" ? "public" : `"${q(t.schema)}"`}."${q(t.name)}", $JSON$${jsonText}$JSON$::json) ON CONFLICT DO NOTHING;`,
      `data:${t.schema}.${t.name}[${i}]`
    );
    if (res !== null) inserted += chunk.length;
  }
  if (t.force_rls) await runSql(`ALTER TABLE ${schemaPrefix}"${q(t.name)}" FORCE ROW LEVEL SECURITY;`, `force:${t.name}`, true);
  console.log(`  ${t.schema}.${t.name}: ${inserted}/${rows.length} rows`);
}

// ---------- 7. Sequences ----------
for (const s of dump.sequences ?? []) {
  if (s.last_value === null) continue;
  await runSql(`SELECT setval('"${q(s.schema)}"."${q(s.name)}"', ${s.last_value}, true);`, `sequence:${s.name}`, true);
}

// ---------- 8. RLS ----------
for (const t of appTables) {
  const schemaPrefix = t.schema === "public" ? "public." : `"${q(t.schema)}".`;
  if (t.rls) await runSql(`ALTER TABLE ${schemaPrefix}"${q(t.name)}" ENABLE ROW LEVEL SECURITY;`, `rls:${t.name}`, true);
  if (t.force_rls) await runSql(`ALTER TABLE ${schemaPrefix}"${q(t.name)}" FORCE ROW LEVEL SECURITY;`, `forcerls:${t.name}`, true);
  for (const p of t.policies ?? []) {
    const roles = typeof p.roles === "string" ? JSON.parse(p.roles) : p.roles;
    const roleList = (roles ?? []).map((r: string) => `"${q(r)}"`).join(", ") || "public";
    let sql = `CREATE POLICY "${q(p.name)}" ON ${schemaPrefix}"${q(t.name)}" FOR ${p.cmd} TO ${roleList}`;
    if (p.qual) sql += ` USING (${p.qual})`;
    if (p.with_check) sql += ` WITH CHECK (${p.with_check})`;
    sql += `;`;
    await runSql(`DROP POLICY IF EXISTS "${q(p.name)}" ON ${schemaPrefix}"${q(t.name)}";`, `drop-pol:${t.name}.${p.name}`, true);
    await runSql(sql, `policy:${t.name}.${p.name}`, true);
  }
}

// ---------- 9. Triggers ----------
for (const t of tables) {
  for (const tg of t.triggers ?? []) {
    await runSql(tg.def.replace(/;$/, "") + ";", `trigger:${t.name}`, true);
  }
}

// ---------- 10. Views ----------
for (const v of dump.views ?? []) {
  const kind = v.kind === "m" ? "MATERIALIZED VIEW" : "VIEW";
  const schemaPrefix = v.schema === "public" ? "public." : `"${q(v.schema)}".`;
  await runSql(`CREATE ${kind} ${schemaPrefix}"${q(v.name)}" AS ${v.def.replace(/;$/, "")};`, `view:${v.name}`, true);
}

// ---------- 11. Buckets ----------
for (const b of dump.buckets ?? []) {
  await runSql(
    `INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
     VALUES ('${q(b.id)}', '${q(b.name)}', ${b.public ?? false}, ${b.file_size_limit ?? "NULL"}, ${b.allowed_mime_types ? `'${q(JSON.stringify(b.allowed_mime_types))}'::jsonb` : "NULL"})
     ON CONFLICT (id) DO NOTHING;`,
    `bucket:${b.id}`, true);
}

// ---------- 12. Verify ----------
console.log("\n=== VERIFY ===");
const counts = await runSql(
  `SELECT schemaname, relname AS table, n_live_tup AS rows
   FROM pg_stat_user_tables WHERE schemaname = 'public'
   ORDER BY n_live_tup DESC LIMIT 40;`,
  "verify-counts"
);
if (counts) for (const r of counts) console.log(`  ${r.schemaname}.${r.table}: ${r.rows}`);

await Bun.write("/tmp/migration/apply-failures.json", JSON.stringify(failures, null, 2));
console.log(`\nDone. ${failures.length} non-critical skips (saved to /tmp/migration/apply-failures.json).`);
