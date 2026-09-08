// Replay the repo's supabase/migrations/*.sql onto the NEW project in order.
// Resumable: completed files are tracked in /tmp/migration/replayed.txt so a
// re-run continues where it stopped instead of hitting "already exists".
// SECURITY: token is read from /tmp/sb_token and never printed.
import { appendFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const NEW_REF = "hslpfgwmbvxkliszpbtx";
const token = readFileSync("/tmp/sb_token", "utf8").trim();
const API = `https://api.supabase.com/v1/projects/${NEW_REF}/database/query`;
const MARKER = "/tmp/migration/replayed.txt";

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

/** Split SQL into statements, respecting $$-dollar quotes, strings, and comments. */
function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let cur = "", i = 0, inS = false, inDQ = false, inLC = false, inBC = false;
  let dollarTag: string | null = null;
  while (i < sql.length) {
    const rest = sql.slice(i);
    if (!inS && !inDQ && !inLC && !inBC) {
      if (dollarTag === null) {
        const m = rest.match(/^\$([A-Za-z_][A-Za-z0-9_]*)?\$/);
        if (m) { dollarTag = m[0]; cur += m[0]; i += m[0].length; continue; }
      } else if (rest.startsWith(dollarTag)) {
        cur += dollarTag; i += dollarTag.length; dollarTag = null; continue;
      }
    }
    const ch = sql[i], next = sql[i + 1] ?? "";
    if (!inS && !inDQ && dollarTag === null) {
      if (ch === "-" && next === "-") { inLC = true; cur += ch; i++; continue; }
      if (ch === "/" && next === "*") { inBC = true; cur += ch; i++; continue; }
    }
    if (inLC) { if (ch === "\n") inLC = false; cur += ch; i++; continue; }
    if (inBC) {
      if (ch === "*" && next === "/") { inBC = false; cur += "*/"; i += 2; continue; }
      cur += ch; i++; continue;
    }
    if (!inDQ && dollarTag === null && ch === "'") {
      if (inS && next === "'") { cur += "''"; i += 2; continue; }
      inS = !inS; cur += ch; i++; continue;
    }
    if (!inS && dollarTag === null && ch === '"') { inDQ = !inDQ; cur += ch; i++; continue; }
    if (!inS && !inDQ && dollarTag === null && ch === ";") {
      if (cur.trim()) out.push(cur.trim());
      cur = ""; i++; continue;
    }
    cur += ch; i++;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// --- 1. Drop the provisional phase-1 site_content (wrong constraints; migrations recreate it properly)
console.log("Dropping provisional site_content table...");
await runSql(`DROP TABLE IF EXISTS public.site_content CASCADE;`);

// --- 2. Replay migrations, resumably
const done = new Set(existsSync(MARKER) ? readFileSync(MARKER, "utf8").split("\n").filter(Boolean) : []);
const dir = "supabase/migrations";
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
console.log(`Found ${files.length} migrations; ${done.size} already replayed.`);

let applied = 0, skipped = 0;
for (const f of files) {
  if (done.has(f)) { skipped++; continue; }
  const sql = readFileSync(`${dir}/${f}`, "utf8");
  try {
    await runSql(sql);
  } catch (e) {
    // Fall back to per-statement execution to isolate the failure
    const stmts = splitStatements(sql);
    let failed: { idx: number; err: string; stmt: string } | null = null;
    for (let idx = 0; idx < stmts.length; idx++) {
      try {
        await runSql(stmts[idx]);
      } catch (e2) {
        failed = { idx, err: String((e2 as Error).message), stmt: stmts[idx] };
        break;
      }
    }
    if (failed) {
      console.error(`\nFAILED in ${f} (statement ${failed.idx + 1}/${stmts.length}):`);
      console.error(`  error: ${failed.err}`);
      console.error(`  statement: ${failed.stmt.slice(0, 300)}`);
      process.exit(1);
    }
    console.log(`OK (per-statement, ${stmts.length} stmts) ${f}`);
  }
  appendFileSync(MARKER, f + "\n");
  done.add(f);
  applied++;
  console.log(`OK ${f}`);
}
console.log(`\nReplay done: ${applied} applied, ${skipped} skipped (previously done).`);

// --- 3. Record migration history (best-effort, matches old project's supabase_migrations)
try {
  const cols = await runSql(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='supabase_migrations' AND table_name='schema_migrations' ORDER BY ordinal_position;`
  );
  console.log("schema_migrations columns:", JSON.stringify(cols));
  for (const f of files) {
    const version = f.replace(/\.sql$/, "").split("_")[0];
    const name = f.replace(/\.sql$/, "").split("_").slice(1).join("_");
    try {
      await runSql(
        `INSERT INTO supabase_migrations.schema_migrations (version, name, statements) VALUES ('${version}', '${name.replace(/'/g, "''")}', '[]'::jsonb) ON CONFLICT (version) DO NOTHING;`
      );
    } catch { /* non-fatal */ }
  }
  const hist = await runSql(`SELECT count(*)::int AS n FROM supabase_migrations.schema_migrations;`);
  console.log("Migration history rows:", JSON.stringify(hist));
} catch (e) {
  console.log("Migration history tracking skipped:", String((e as Error).message).slice(0, 200));
}

// --- 4. Verify
const tableCount = await runSql(`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';`);
const polCount = await runSql(`SELECT count(*)::int AS n FROM pg_policies WHERE schemaname IN ('public','storage');`);
const fnCount = await runSql(`SELECT count(*)::int AS n FROM information_schema.routines WHERE routine_schema IN ('public','app_private');`);
const enumCount = await runSql(`SELECT count(*)::int AS n FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE t.typtype='e' AND n.nspname='public';`);
const siteRows = await runSql(`SELECT count(*)::int AS n FROM public.site_content;`).catch(() => null);
console.log("\n=== VERIFY ===");
console.log("public tables:", JSON.stringify(tableCount));
console.log("policies (public+storage):", JSON.stringify(polCount));
console.log("routines (public+app_private):", JSON.stringify(fnCount));
console.log("public enums:", JSON.stringify(enumCount));
console.log("site_content rows:", JSON.stringify(siteRows));
console.log("\nMigration replay complete.");
