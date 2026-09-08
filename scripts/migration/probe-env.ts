// Probes which database-related env vars exist at runtime.
// SECURITY: prints only variable NAMES (presence), never values.
const candidates = [
  "SUPABASE_DB_URL",
  "DATABASE_URL",
  "POSTGRES_URL",
  "SUPABASE_PG_URL",
  "SUPABASE_DB_PASSWORD",
  "POSTGRES_PASSWORD",
  "SUPABASE_URL",
  "VITE_SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SERVICE_KEY",
];

console.log("Runtime env probe (names only):");
let any = false;
for (const name of candidates) {
  if (process.env[name]) {
    console.log(`  SET: ${name}`);
    any = true;
  }
}
if (!any) console.log("  (none of the candidate vars are set)");

// Also check .env file names present in project root (names of files only)
import { existsSync, readdirSync } from "node:fs";
const envFiles = readdirSync(process.cwd()).filter((f) => f.startsWith(".env"));
console.log("Env files in project root:", envFiles.length ? envFiles.join(", ") : "(none)");
