// Copy ALL public data from the old (broken-auth) project hslpfgwmbvxkliszpbtx
// into the fresh project oachjythntjgynfoagvv, whose schema was built from
// supabase/migrations. Order is computed from FK dependencies (parents first)
// with retry passes for self/cyclic references.
// SECURITY: tokens come from /tmp, never printed.
import { readFileSync } from "node:fs";

const OLD = "hslpfgwmbvxkliszpbtx";
const NEW = "oachjythntjgynfoagvv";
const tOld = readFileSync("/tmp/sb_token", "utf8").trim();
const tNew = readFileSync("/tmp/sb_token_v2", "utf8").trim();

async function sql(token, ref, query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (r.status !== 201) throw new Error(`${r.status}: ${t.slice(0, 400)}`);
  return JSON.parse(t);
}

const q = (s) => s.replace(/'/g, "''");

async function main() {
  const tablesOld = (await sql(tOld, OLD, "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name")).map((r) => r.table_name);
  const tablesNew = (await sql(tNew, NEW, "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name")).map((r) => r.table_name);
  const onlyOld = tablesOld.filter((t) => !tablesNew.includes(t));
  const onlyNew = tablesNew.filter((t) => !tablesOld.includes(t));
  if (onlyOld.length) console.log("⚠ tables OLD absentes de NEW :", onlyOld.join(", "));
  if (onlyNew.length) console.log("⚠ tables NEW absentes de OLD :", onlyNew.join(", "));
  const targets = tablesOld.filter((t) => tablesNew.includes(t));
  console.log(`Tables à copier : ${targets.length}`);

  // FK graph (parents first) — only among public tables
  const fks = await sql(tOld, OLD, "select c.conrelid::regclass::text as tbl, c.confrelid::regclass::text as parent from pg_constraint c where c.contype = 'f' and c.connamespace = 'public'::regnamespace");
  const edges = fks.filter((e) => e.tbl.startsWith("public.") && e.parent.startsWith("public.")).map((e) => ({ tbl: e.tbl.replace("public.", ""), parent: e.parent.replace("public.", "") }));
  const tset = new Set(targets);
  const deps = {}; // table -> set of parents (public)
  for (const e of edges) {
    if (!tset.has(e.tbl) || !tset.has(e.parent)) continue;
    (deps[e.tbl] ??= new Set()).add(e.parent);
  }
  const ordered = [];
  const done = new Set();
  let guard = 0;
  while (ordered.length < targets.length && guard++ < targets.length * 3) {
    let progressed = false;
    for (const t of targets) {
      if (done.has(t)) continue;
      const parents = deps[t];
      if (!parents || [...parents].every((p) => done.has(p))) {
        ordered.push(t);
        done.add(t);
        progressed = true;
      }
    }
    if (!progressed) break; // cycle restant
  }
  for (const t of targets) if (!done.has(t)) ordered.push(t);
  console.log("Ordre de copie (parents d'abord) :", ordered.join(", "));

  const summary = [];
  let pending = ordered.filter((t) => {
    const countRes = null; // computed later lazily
    return true;
  });
  const counts = {};
  for (const table of ordered) {
    const [{ n }] = await sql(tOld, OLD, `select count(*)::int as n from public."${table}"`);
    counts[table] = n;
  }

  async function copyTable(table, isRetry) {
    const n = counts[table];
    if (!n) return 0;
    const tq = q(table);
    const colsMeta = await sql(tNew, NEW, `select column_name, is_generated, is_identity from information_schema.columns where table_schema = 'public' and table_name = '${tq}' order by ordinal_position`);
    const cols = colsMeta.filter((c) => c.is_generated === "NEVER");
    const colList = cols.map((c) => `"${c.column_name}"`).join(", ");
    const hasIdentity = cols.some((c) => c.is_identity === "YES");
    const sel = cols.map((c) => `(rec)."${c.column_name}"`).join(",");
    const overriding = hasIdentity ? "OVERRIDING SYSTEM VALUE " : "";
    const CHUNK = 300;
    let copied = 0;
    for (let off = 0; off < n; off += CHUNK) {
      const [{ arr }] = await sql(tOld, OLD, `select coalesce(json_agg(to_jsonb(t))::text, '[]') as arr from (select * from public."${tq}" order by ctid limit ${CHUNK} offset ${off}) t`);
      if (!arr || arr === "[]") break;
      const json = q(arr);
      const ins = `INSERT INTO public."${tq}" ${overriding}(${colList}) SELECT ${sel} FROM jsonb_populate_recordset(NULL::public."${tq}", '${json}'::jsonb) rec`;
      await sql(tNew, NEW, ins);
      copied += JSON.parse(arr).length;
    }
    return copied;
  }

  // Première passe dans l'ordre topologique ; erreurs -> file de rattrapage
  const failed = [];
  for (const table of ordered) {
    if (!counts[table]) { summary.push({ table, from: 0, to: 0 }); continue; }
    try {
      const c = await copyTable(table, false);
      summary.push({ table, from: counts[table], to: c });
      console.log(`OK   ${table}: ${counts[table]} -> ${c}`);
    } catch (e) {
      failed.push({ table, err: e.message });
      console.log(`PEND ${table}: ${e.message.slice(0, 120)}`);
    }
  }
  // Passe(s) de rattrapage
  let pass = 0;
  while (failed.length && pass++ < 5) {
    const still = [];
    for (const f of failed) {
      try {
        const c = await copyTable(f.table, true);
        summary.push({ table: f.table, from: counts[f.table], to: c });
        console.log(`OK2  ${f.table}: ${counts[f.table]} -> ${c} (rattrapage ${pass})`);
      } catch (e) {
        still.push({ table: f.table, err: e.message });
        console.log(`PEND2 ${f.table}: ${e.message.slice(0, 120)}`);
      }
    }
    failed.length = 0;
    failed.push(...still);
  }

  console.log("\n=== Tables restées en échec ===\n");
  for (const f of failed) console.log("!!", f.table, "->", f.err.slice(0, 200));

  // Vérification finale des comptes
  console.log("\n=== Vérification comptes ===\n");
  for (const s of summary) {
    // ignore: on vérifie par table depuis NEW
  }
  for (const table of ordered) {
    const [{ n: to }] = await sql(tNew, NEW, `select count(*)::int as n from public."${table}"`);
    const from = counts[table];
    if (from !== to) console.log(`${from === 0 && to === 0 ? "vide" : "!! DIFF"} ${table}: ${from} -> ${to}`);
  }
  console.log("Terminé.");
}

main().catch((e) => {
  console.error("ERREUR:", e.message);
  process.exit(1);
});
