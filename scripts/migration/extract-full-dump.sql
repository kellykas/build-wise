-- ============================================================
-- FULL DATABASE EXTRACTION (run in Lovable Cloud -> Database -> SQL Editor)
-- Returns ONE cell named "dump" containing the entire database as JSON.
-- Copy the whole cell value and send it back (or save as full-dump.json).
-- Read-only: creates only a TEMP table inside your session.
-- ============================================================
DROP TABLE IF EXISTS _migration_dump;
CREATE TEMP TABLE _migration_dump(value json);

DO $$
DECLARE
  r record;
  rows_json json;
  cols_json json;
  cons_json json;
  idx_json json;
  trig_json json;
  pol_json json;
  tbl_json json;
  tables_json jsonb := '[]'::jsonb;
  funcs_json json;
  views_json json;
  enums_json json;
  seqs_json json;
  ext_json json;
  schema_json json;
  buckets_json json;
  all_json json;
BEGIN
  -- Extensions (excluding plpgsql which exists by default)
  SELECT json_agg(json_build_object('name', extname, 'version', extversion))
    INTO ext_json FROM pg_extension WHERE extname <> 'plpgsql';

  -- Custom schemas (non-system, not extension-owned)
  SELECT json_agg(DISTINCT n.nspname)
    INTO schema_json
    FROM pg_namespace n
    WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast','auth','storage',
                            'supabase_functions','supabase_storage','realtime','extensions',
                            'net','pgsodium','pgsodium_masks','vault','graphql','graphql_public',
                            'cron','pgtle','pgbouncer')
      AND n.nspname NOT LIKE 'pg\_%'
      AND n.oid NOT IN (SELECT extnamespace FROM pg_extension);

  -- Enums
  SELECT json_agg(json_build_object('schema', n.nspname, 'name', t.typname, 'values', (
      SELECT json_agg(e.enumlabel ORDER BY e.enumsortorder) FROM pg_enum e WHERE e.enumtypid = t.oid)))
    INTO enums_json
    FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typtype = 'e'
      AND n.nspname NOT IN ('pg_catalog','information_schema','auth','storage','extensions','net','pgsodium','vault','realtime','supabase_functions','supabase_storage')
      AND n.nspname NOT LIKE 'pg\_%'
      AND n.oid NOT IN (SELECT extnamespace FROM pg_extension);

  -- Tables (+ rows). Includes public/custom schemas, plus auth.users + auth.identities
  FOR r IN
    SELECT n.nspname AS schema, c.relname AS name, c.oid AS oid,
           c.relrowsecurity AS rls, c.relforcerowsecurity AS forcerls
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r','p')
      AND (
        (n.nspname NOT IN ('pg_catalog','information_schema','pg_toast','auth','storage',
                           'supabase_functions','supabase_storage','realtime','extensions',
                           'net','pgsodium','pgsodium_masks','vault','graphql','graphql_public',
                           'cron','pgtle','pgbouncer')
         AND n.nspname NOT LIKE 'pg\_%'
         AND n.oid NOT IN (SELECT extnamespace FROM pg_extension))
        OR (n.nspname = 'auth' AND c.relname IN ('users','identities'))
      )
    ORDER BY n.nspname, c.relname
  LOOP
    SELECT json_agg(json_build_object(
             'name', a.attname,
             'type', pg_catalog.format_type(a.atttypid, a.atttypmod),
             'notnull', a.attnotnull,
             'default', pg_get_expr(d.adbin, d.adrelid)) ORDER BY a.attnum)
      INTO cols_json
      FROM pg_attribute a
      LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE a.attrelid = r.oid AND a.attnum > 0 AND NOT a.attisdropped;

    SELECT json_agg(json_build_object('name', x.conname, 'def', pg_get_constraintdef(x.oid)))
      INTO cons_json
      FROM pg_constraint x WHERE x.conrelid = r.oid;

    SELECT json_agg(json_build_object('name', i.relname, 'def', pg_get_indexdef(i.oid)))
      INTO idx_json
      FROM pg_class i
      JOIN pg_index ix ON ix.indexrelid = i.oid
      WHERE ix.indrelid = r.oid AND NOT ix.indisprimary;

    SELECT json_agg(json_build_object('def', pg_get_triggerdef(tg.oid)) ORDER BY tg.tgname)
      INTO trig_json
      FROM pg_trigger tg WHERE tg.tgrelid = r.oid AND NOT tg.tgisinternal;

    SELECT json_agg(json_build_object('name', p.policyname, 'cmd', p.cmd,
             'roles', array_to_json(p.roles), 'qual', p.qual, 'with_check', p.with_check))
      INTO pol_json
      FROM pg_policies p WHERE p.schemaname = r.schema AND p.tablename = r.name;

    EXECUTE format('SELECT coalesce(json_agg(row_to_json(x)), ''[]''::json) FROM %I.%I x', r.schema, r.name)
      INTO rows_json;

    tbl_json := json_build_object('schema', r.schema, 'name', r.name,
      'rls', r.rls, 'force_rls', r.forcerls,
      'columns', cols_json, 'constraints', cons_json, 'indexes', idx_json,
      'triggers', trig_json, 'policies', pol_json, 'rows', rows_json);
    tables_json := tables_json || tbl_json::jsonb;
  END LOOP;

  -- Functions (public/custom schemas only; skip extension-owned and auth defaults)
  SELECT json_agg(json_build_object('schema', n.nspname, 'name', p.proname, 'def', pg_get_functiondef(p.oid)))
    INTO funcs_json
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prokind = 'f'
      AND n.nspname NOT IN ('pg_catalog','information_schema','auth','storage','extensions','net','pgsodium','vault','realtime','supabase_functions','supabase_storage')
      AND n.nspname NOT LIKE 'pg\_%'
      AND n.oid NOT IN (SELECT extnamespace FROM pg_extension)
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e');

  -- Views + materialized views
  SELECT json_agg(json_build_object('schema', n.nspname, 'name', c.relname, 'kind', c.relkind, 'def', pg_get_viewdef(c.oid, true)))
    INTO views_json
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('v','m')
      AND n.nspname NOT IN ('pg_catalog','information_schema','auth','storage','extensions','net','pgsodium','vault','realtime','supabase_functions','supabase_storage')
      AND n.nspname NOT LIKE 'pg\_%'
      AND n.oid NOT IN (SELECT extnamespace FROM pg_extension);

  -- Sequences with current values
  SELECT json_agg(json_build_object('schema', s.schemaname, 'name', s.sequencename, 'last_value', s.last_value))
    INTO seqs_json
    FROM pg_sequences s
    WHERE s.schemaname NOT IN ('pg_catalog','information_schema','auth','storage','extensions','net','pgsodium','vault','realtime','supabase_functions','supabase_storage')
      AND s.schemaname NOT LIKE 'pg\_%';

  -- Storage buckets (metadata; file contents are not in the database)
  SELECT coalesce(json_agg(row_to_json(b)), '[]'::json) INTO buckets_json FROM storage.buckets b;

  all_json := json_build_object(
    'extracted_at', now(),
    'extensions', ext_json,
    'schemas', schema_json,
    'enums', enums_json,
    'tables', tables_json,
    'functions', funcs_json,
    'views', views_json,
    'sequences', seqs_json,
    'buckets', buckets_json
  );
  INSERT INTO _migration_dump VALUES (all_json);
END $$;

SELECT value AS dump FROM _migration_dump;
