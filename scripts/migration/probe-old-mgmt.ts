// Confirm whether the personal access token can reach the OLD project ref.
// SECURITY: prints only HTTP status codes, never token values.
import { readFileSync } from "node:fs";

const OLD_REF = "enmeoenjyjajiuhnkmer";
const token = readFileSync("/tmp/sb_token", "utf8").trim();

for (const path of [
  `/projects/${OLD_REF}`,
  `/projects/${OLD_REF}/database/query`,
]) {
  const opts: RequestInit =
    path.endsWith("/query")
      ? { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: "select 1" }) }
      : { headers: { Authorization: `Bearer ${token}` } };
  const res = await fetch(`https://api.supabase.com/v1${path}`, opts);
  console.log(`${path} -> ${res.status}`);
}
