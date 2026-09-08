// Extract the FULL old database over a direct Postgres connection.
// Usage: bun scripts/migration/dump-full.ts "<postgres connection string>"
//        (or set SUPABASE_DB_URL / DATABASE_URL in the environment)
// SECURITY: never prints the connection string or password.
import { existsSync, readFileSync } from "node:fs";
import { SQL } from "bun";

let connStr = process.argv[2];
if (!connStr) {
  for (const name of ["SUPABASE_DB_URL", "DATABASE_URL", "POSTGRES_URL"]) {
    if (process.env[name]) { connStr = process.env[name]; break; }
  }
}
if (!connStr) {
  console.error("No connection string provided (arg or SUPABASE_DB_URL/DATABASE_URL env).");
  process.exit(1);
}

const sql = new SQL(connStr);

const SYSTEM = `'pg_catalog','information_schema','pg_toast','auth','storage','supabase_functions','supabase_storage','realtime','extensions','net','pgsodium','pgsodium_masks','vault','graphql','graphql_public','cron','pgtle','pgbouncer'`;

async function one(query: string): Promise<any> {
  const res = await sql.unsafe(query);
  return res.rows ?? res;
}

const extensions = await one(
  `SELECT json_agg(json_build_object('name', extname, 'version', extversion)) AS j FROM pg_extension WHERE extname <> 'plpgsql'`
);
const schemas = await one(
  `SELECT json_agg(DISTINCT n.nspname) AS j FROM pg_namespace n
   WHERE n.nspname NOT IN (${SYSTEM}) AND n.nspname NOT LIKE 'pg\\_%'
     AND n.oid NOT IN (SELECT extnamespace FROM pg_extension)`
);
const enums = await one(
  `SELECT json_agg(json_build_object('schema', n.nspname, 'name', t.typname, 'values', (
      SELECT json_agg(e.enumlabel ORDER BY e.enumsortorder) FROM pg_enum e WHERE e.enumtypid = t.oid))) AS j
   FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
   WHERE t.typtype = 'e'
     AND n.nspname NOT IN (${SYSTEM}) AND n.nspname NOT LIKE 'pg\\_%'
     AND n.oid NOT IN (SELECT extnamespace FROM pg_extension)`
);

const tableList = await one(
  `SELECT n.nspname AS schema, c.relname AS name, c.oid AS oid, c.relrowsecurity AS rls,
          c.relforcerowsecurity AS forcerls
   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE c.relkind IN ('r','p')
     AND ((n.nspname NOT IN (${SYSTEM}) AND n.nspname NOT LIKE 'pg\\_%'
           AND n.oid NOT IN (SELECT extnamespace FROM pg_extension))
          OR (n.nspname = 'auth' AND c.relname IN ('users','identities')))
   ORDER BY n.nspname, c.relname`
);

const tables: any[] = [];
for (const t of tableList) {
  const cols = await one(
    `SELECT json_agg(json_build_object('name', a.attname, 'type', pg_catalog.format_type(a.atttypid, a.atttypmod),
       'notnull', a.attnotnull, 'default', pg_get_expr(d.adbin, d.adrelid)) ORDER BY a.attnum) AS j
     FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
     WHERE a.attrelid = ${t.oid} AND a.attnum > 0 AND NOT a.attisdropped`
  );
  const cons = await one(
    `SELECT json_agg(json_build_object('name', x.conname, 'def', pg_get_constraintdef(x.oid))) AS j
     FROM pg_constraint x WHERE x.conrelid = ${t.oid}`
  );
  const idx = await one(
    `SELECT json_agg(json_build_object('name', i.relname, 'def', pg_get_indexdef(i.oid))) AS j
     FROM pg_class i JOIN pg_index ix ON ix.indexrelid = i.oid
     WHERE ix.indrelid = ${t.oid} AND NOT ix.indisprimary`
  );
  const trig = await one(
    `SELECT json_agg(json_build_object('def', pg_get_triggerdef(tg.oid)) ORDER BY tg.tgname) AS j
     FROM pg_trigger tg WHERE tg.tgrelid = ${t.oid} AND NOT tg.tgisinternal`
  );
  const pol = await one(
    `SELECT json_agg(json_build_object('name', p.policyname, 'cmd', p.cmd,
       'roles', array_to_json(p.roles), 'qual', p.qual, 'with_check', p.with_check)) AS j
     FROM pg_policies p WHERE p.schemaname = '${t.schema}' AND p.tablename = '${t.name}'`
  );
  const rows = await one(
    `SELECT coalesce(json_agg(row_to_json(x)), '[]'::json) AS j FROM "${t.schema}"."${t.name}" x`
  );
  tables.push({
    schema: t.schema, name: t.name, rls: t.rls, force_rls: t.forcerls,
    columns: cols?.j ?? [], constraints: cons?.j ?? [], indexes: idx?.j ?? [],
    triggers: trig?.j ?? [], policies: pol?.j ?? [], rows: rows?.j ?? [],
  });
  console.log(`  extracted ${t.schema}.${t.name} (${(rows?.j ?? []).length} rows)`);
}

const functions = await one(
  `SELECT json_agg(json_build_object('schema', n.nspname, 'name', p.proname, 'def', pg_get_functiondef(p.oid))) AS j
   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE p.prokind = 'f'
     AND n.nspname NOT IN (${SYSTEM}) AND n.nspname NOT LIKE 'pg\\_%'
     AND n.oid NOT IN (SELECT extnamespace FROM pg_extension)
     AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')`
);
const views = await one(
  `SELECT json_agg(json_build_object('schema', n.nspname, 'name', c.relname, 'kind', c.relkind, 'def', pg_get_viewdef(c.oid, true))) AS j
   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE c.relkind IN ('v','m')
     AND n.nspname NOT IN (${SYSTEM}) AND n.nspname NOT LIKE 'pg\\_%'
     AND n.oid NOT IN (SELECT extnamespace FROM pg_extension)`
);
const sequences = await one(
  `SELECT json_agg(json_build_object('schema', s.schemaname, 'name', s.sequencename, 'last_value', s.last_value)) AS j
   FROM pg_sequences s
   WHERE s.schemaname NOT IN (${SYSTEM}) AND s.schemaname NOT LIKE 'pg\\_%'`
);
const buckets = await one(`SELECT coalesce(json_agg(row_to_json(b)), '[]'::json) AS j FROM storage.buckets b`);

const dump = {
  extracted_at: new Date().toISOString(),
  extensions: extensions?.j ?? [],
  schemas: schemas?.j ?? [],
  enums: enums?.j ?? [],
  tables,
  functions: functions?.j ?? [],
  views: views?.j ?? [],
  sequences: sequences?.j ?? [],
  buckets: buckets?.j ?? [],
};

await Bun.write("/tmp/migration/full-dump.json", JSON.stringify(dump));
const size = (JSON.stringify(dump).length / 1024).toFixed(0);
console.log(`\nDump complete: ${tables.length} tables, ${dump.functions?.length ?? 0} functions -> /tmp/migration/full-dump.json (${size} KB)`);
console.log("Next: bun scripts/migration/apply-full-dump.ts /tmp/migration/full-dump.json");
