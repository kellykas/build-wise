// Migrate ALL remaining data from the OLD Supabase to the NEW one.
// Uses REST API with the old anon/publishable key to read data,
// then writes it via the Management API to the new project.
// Usage: OLD_SUPABASE_URL=https://xxx.supabase.co OLD_SUPABASE_KEY=eyJ... bun scripts/migration/migrate-all-data.ts
// Or: bun scripts/migration/migrate-all-data.ts <old_supabase_url> <old_anon_key>
import { readFileSync } from "node:fs";

const NEW_REF = "hslpfgwmbvxkliszpbtx";
const token = readFileSync("/tmp/sb_token", "utf8").trim();
const NEW_API = `https://api.supabase.com/v1/projects/${NEW_REF}/database/query`;

// Old Supabase credentials
const OLD_URL =
  process.argv[2] || process.env.OLD_SUPABASE_URL || process.env.SUPABASE_URL;
const OLD_KEY =
  process.argv[3] || process.env.OLD_SUPABASE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!OLD_URL || !OLD_KEY) {
  console.error(
    "Provide old Supabase URL and key:\n  OLD_SUPABASE_URL=xxx OLD_SUPABASE_KEY=xxx bun scripts/migration/migrate-all-data.ts\n  or: bun scripts/migration/migrate-all-data.ts <url> <key>"
  );
  process.exit(1);
}

const isNewKey = OLD_KEY.startsWith("sb_publishable_") || OLD_KEY.startsWith("sb_secret_");

const COMPANY_ID = "844d7edc-d592-40b0-a5b7-d23fea7d6183";

// Tables to migrate (excluding auth.*, storage.*, site_content, profiles, user_roles, companies — already done)
const TABLES = [
  "projects",
  "tasks",
  "task_assignments",
  "clients",
  "employees",
  "invoices",
  "invoice_payments",
  "invoice_reminders",
  "purchase_orders",
  "suppliers",
  "inventory_items",
  "equipment",
  "requisitions",
  "requisition_lines",
  "requisition_disbursements",
  "quotes",
  "quote_items",
  "attendance",
  "payroll_rules",
  "payslips",
  "transactions",
  "audit_logs",
  "notifications",
  "internal_notifications",
  "notification_log",
  "notification_templates",
  "notification_type_settings",
  "reminder_settings",
  "agenda_events",
  "appointments",
  "documents",
  "inquiries",
  "user_permissions",
];

async function runNewSql(query: string): Promise<any> {
  const res = await fetch(NEW_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg =
      typeof body === "string"
        ? body
        : body?.error?.message ?? body?.message ?? JSON.stringify(body);
    throw new Error(`${res.status}: ${String(msg).slice(0, 400)}`);
  }
  return body;
}

async function fetchOldTable(
  table: string,
  select = "*",
  head = false
): Promise<any[]> {
  const headers: Record<string, string> = { apikey: OLD_KEY };
  if (!isNewKey) headers["Authorization"] = `Bearer ${OLD_KEY}`;
  if (head) headers["Prefer"] = "count=exact";
  headers["Range"] = "0-0";

  const res = await fetch(`${OLD_URL}/rest/v1/${table}?select=${select}`, {
    headers,
  });
  if (!res.ok) return [];
  const cr = res.headers.get("content-range");
  const total = cr ? parseInt(cr.split("/")[1]) : 0;
  return [{ total }];
}

async function fetchAllOld(table: string): Promise<any[]> {
  const headers: Record<string, string> = { apikey: OLD_KEY };
  if (!isNewKey) headers["Authorization"] = `Bearer ${OLD_KEY}`;

  const PAGE_SIZE = 1000;
  let offset = 0;
  let allRows: any[] = [];

  while (true) {
    headers["Range"] = `${offset}-${offset + PAGE_SIZE - 1}`;
    const res = await fetch(
      `${OLD_URL}/rest/v1/${table}?select=*&order=created_at`,
      { headers }
    );
    if (!res.ok) break;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    allRows = allRows.concat(rows);
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return allRows;
}

// Escape for SQL string literals
function q(s: string): string {
  return s ? String(s).replace(/'/g, "''") : "";
}

// Insert rows via json_populate_recordset
async function insertRows(
  table: string,
  rows: any[],
  schema = "public"
): Promise<number> {
  if (rows.length === 0) return 0;

  // Disable RLS temporarily for bulk insert
  await runNewSql(
    `ALTER TABLE ${schema}."${q(table)}" NO FORCE ROW LEVEL SECURITY;`
  ).catch(() => {});

  const CHUNK = 150;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const jsonText = JSON.stringify(chunk);
    try {
      await runNewSql(
        `INSERT INTO ${schema}."${q(table)}" SELECT * FROM json_populate_recordset(NULL::${schema}."${q(table)}", '${jsonText.replace(/'/g, "''")}'::json) ON CONFLICT DO NOTHING;`
      );
      inserted += chunk.length;
    } catch (e) {
      console.error(
        `  Failed chunk ${i}-${i + chunk.length}:`,
        (e as Error).message.slice(0, 200)
      );
      // Try row by row as fallback
      for (const row of chunk) {
        try {
          const jsonRow = JSON.stringify(row);
          await runNewSql(
            `INSERT INTO ${schema}."${q(table)}" SELECT * FROM json_populate_recordset(NULL::${schema}."${q(table)}", '${jsonRow.replace(/'/g, "''")}'::json) ON CONFLICT DO NOTHING;`
          );
          inserted++;
        } catch {
          // Skip individual row errors
        }
      }
    }
  }

  // Re-enable RLS
  await runNewSql(
    `ALTER TABLE ${schema}."${q(table)}" FORCE ROW LEVEL SECURITY;`
  ).catch(() => {});

  return inserted;
}

console.log(`Old Supabase: ${OLD_URL}`);
console.log(`New project: ${NEW_REF}`);
console.log(`Migrating ${TABLES.length} tables...\n`);

let totalRows = 0;
const results: { table: string; count: number; error?: string }[] = [];

for (const table of TABLES) {
  try {
    const rows = await fetchAllOld(table);
    if (rows.length === 0) {
      console.log(`${table.padEnd(30)} 0 rows (empty)`);
      results.push({ table, count: 0 });
      continue;
    }
    const inserted = await insertRows(table, rows);
    totalRows += inserted;
    console.log(`${table.padEnd(30)} ${inserted}/${rows.length} rows`);
    results.push({ table, count: inserted });
  } catch (e) {
    const msg = (e as Error).message.slice(0, 120);
    console.error(`${table.padEnd(30)} ERROR: ${msg}`);
    results.push({ table, count: 0, error: msg });
  }
}

// Summary
console.log("\n=== SUMMARY ===");
console.log(`Total rows migrated: ${totalRows}`);
const failures = results.filter((r) => r.error);
if (failures.length) {
  console.log(`Failures (${failures.length}):`);
  failures.forEach((f) => console.log(`  ${f.table}: ${f.error}`));
}

// Verify row counts
console.log("\n=== VERIFICATION ===");
const counts = await runNewSql(
  `SELECT relname AS tbl, n_live_tup AS rows FROM pg_stat_user_tables WHERE schemaname='public' AND n_live_tup > 0 ORDER BY n_live_tup DESC;`
);
for (const r of counts) {
  console.log(`  ${r.tbl}: ${r.rows} rows`);
}
