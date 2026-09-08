// Build a small smoke-test dump from the already-extracted site_content rows
// and run apply-full-dump.ts against it to validate the full pipeline.
import { readFileSync } from "node:fs";

const rows = JSON.parse(readFileSync("/tmp/migration/site-content.json", "utf8"));
const dedup = new Map<string, any>();
for (const r of rows) dedup.set(`${r.section}\u0000${r.key}`, r);

const smoke = {
  extracted_at: new Date().toISOString(),
  extensions: [],
  schemas: [],
  enums: [],
  tables: [
    {
      schema: "public",
      name: "site_content",
      rls: true,
      force_rls: false,
      columns: [
        { name: "id", type: "uuid", notnull: true, default: "gen_random_uuid()" },
        { name: "section", type: "text", notnull: true, default: null },
        { name: "key", type: "text", notnull: true, default: null },
        { name: "value", type: "jsonb", notnull: false, default: null },
        { name: "company_id", type: "uuid", notnull: false, default: null },
        { name: "created_at", type: "timestamp with time zone", notnull: true, default: "now()" },
        { name: "updated_at", type: "timestamp with time zone", notnull: true, default: "now()" },
      ],
      constraints: [{ name: "site_content_pkey", def: "PRIMARY KEY (id)" }],
      indexes: [],
      triggers: [],
      policies: [],
      rows: [...dedup.values()],
    },
  ],
  functions: [],
  views: [],
  sequences: [],
  buckets: [],
};

await Bun.write("/tmp/migration/smoke-dump.json", JSON.stringify(smoke));
console.log(`Smoke dump written with ${dedup.size} rows`);
