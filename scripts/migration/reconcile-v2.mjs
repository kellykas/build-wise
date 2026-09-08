// Post-copy reconciliation on the NEW project: profiles are upserted by id
// (auto rows replaced by real data), extra auto user_roles rows removed,
// site_content fully replaced, then content fingerprints of every public
// table are compared between OLD and NEW.
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

async function fetchAllRows(token, ref, table) {
  const tq = q(table);
  const all = [];
  for (let off = 0; ; off += 300) {
    const [{ arr }] = await sql(token, ref, `select coalesce(json_agg(to_jsonb(t))::text, '[]') as arr from (select * from public."${tq}" order by ctid limit 300 offset ${off}) t`);
    const rows = JSON.parse(arr || "[]");
    all.push(...rows);
    if (rows.length < 300) break;
  }
  return all;
}

async function upsertTable(token, ref, table, rows, pkCols) {
  if (!rows.length) return 0;
  const tq = q(table);
  const colsMeta = await sql(token, ref, `select column_name, is_generated from information_schema.columns where table_schema = 'public' and table_name = '${tq}' order by ordinal_position`);
  const cols = colsMeta.filter((c) => c.is_generated === "NEVER").map((c) => c.column_name);
  // pour chaque ligne: INSERT ... ON CONFLICT (pk) DO UPDATE
  for (const row of rows) {
    const Q = String.fromCharCode(39);
    const esc = (v) => {
      if (v === null || v === undefined) return "NULL";
      if (typeof v === "boolean") return v ? "true" : "false";
      if (typeof v === "number") return String(v);
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      return Q + s.split(Q).join(Q + Q) + Q;
    };
    const colList = cols.map((c) => `"${c}"`).join(", ");
    const valList = cols.map((c) => esc(row[c])).join(", ");
    const upd = cols.filter((c) => !pkCols.includes(c)).map((c) => `"${c}" = EXCLUDED."${c}"`).join(", ");
    const ins = `INSERT INTO public."${tq}" (${colList}) VALUES (${valList}) ON CONFLICT (${pkCols.map((c) => `"${c}"`).join(", ")}) DO UPDATE SET ${upd}`;
    await sql(token, ref, ins);
  }
  return rows.length;
}

async function main() {
  // 1. Profiles : upsert par id (remplace les lignes auto par les vraies)
  const oldProfiles = await fetchAllRows(tOld, OLD, "profiles");
  await upsertTable(tNew, NEW, "profiles", oldProfiles, ["id"]);
  const [{ p: profNew }] = await sql(tNew, NEW, "select count(*)::int as p from public.profiles");
  console.log("profiles OLD:", oldProfiles.length, "-> NEW:", profNew);

  // 2. user_roles : supprimer les lignes en trop (non présentes côté OLD)
  const oldPairs = (await sql(tOld, OLD, "select user_id::text as uid, company_id::text as cid, role from public.user_roles")).map((r) => `('${r.uid}', ${r.cid ? `'${r.cid}'` : "NULL"}, '${r.role}')`).join(", ");
  await sql(tNew, NEW, `DELETE FROM public.user_roles WHERE (user_id::text, company_id::text, role::text) NOT IN (SELECT * FROM (VALUES ${oldPairs}) AS v(uid, cid, role))`);
  const [{ p: urNew }] = await sql(tNew, NEW, "select count(*)::int as p from public.user_roles");
  const [{ p: urOld }] = await sql(tOld, OLD, "select count(*)::int as p from public.user_roles");
  console.log("user_roles OLD:", urOld, "-> NEW:", urNew);

  // 3. site_content : remplacement intégral par le contenu OLD
  await sql(tNew, NEW, "DELETE FROM public.site_content");
  const rows = await fetchAllRows(tOld, OLD, "site_content");
  // insertion par lots via populate_recordset
  for (let i = 0; i < rows.length; i += 300) {
    const chunk = rows.slice(i, i + 300);
    const colsMeta = await sql(tNew, NEW, "select column_name, is_generated from information_schema.columns where table_schema = 'public' and table_name = 'site_content' order by ordinal_position");
    const cols = colsMeta.filter((c) => c.is_generated === "NEVER").map((c) => c.column_name);
    const colList = cols.map((c) => `"${c}"`).join(", ");
    const sel = cols.map((c) => `(rec)."${c}"`).join(",");
    const json = q(JSON.stringify(chunk));
    await sql(tNew, NEW, `INSERT INTO public.site_content (${colList}) SELECT ${sel} FROM jsonb_populate_recordset(NULL::public.site_content, '${json}'::jsonb) rec`);
  }
  const [{ p: scNew }] = await sql(tNew, NEW, "select count(*)::int as p from public.site_content");
  console.log("site_content OLD:", rows.length, "-> NEW:", scNew);

  // 4. Empreintes de contenu de toutes les tables
  const tables = (await sql(tNew, NEW, "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name")).map((r) => r.table_name);
  let diff = 0;
  for (const t of tables) {
    const tq = q(t);
    const getFp = async (token, ref) => {
      const r = await sql(token, ref, `select coalesce(md5(coalesce((select json_agg(j)::text from (select to_jsonb(x)::text as j from public."${tq}" x order by j) s), '')), 'empty') as fp from (select 1) z`);
      return r[0].fp;
    };
    let f1 = "ERR", f2 = "ERR";
    try { f1 = await getFp(tOld, OLD); } catch {}
    try { f2 = await getFp(tNew, NEW); } catch {}
    if (f1 !== f2) {
      diff++;
      const [{ a }] = await sql(tOld, OLD, `select count(*)::int as a from public."${tq}"`);
      const [{ b }] = await sql(tNew, NEW, `select count(*)::int as b from public."${tq}"`);
      console.log(`DIFF ${t}: old=${a} new=${b}`);
    } else {
      console.log(`ok   ${t}`);
    }
  }
  console.log(diff ? `\n${diff} table(s) avec contenu différent` : "\nToutes les tables sont identiques (OLD == NEW).");
}

main().catch((e) => {
  console.error("ERREUR:", e.message);
  process.exit(1);
});
