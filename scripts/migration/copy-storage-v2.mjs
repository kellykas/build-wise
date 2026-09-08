// Copy storage from OLD -> NEW: recreate bucket + copy every object.
// SECURITY: keys come from /tmp, never printed.
import { readFileSync } from "node:fs";

const OLD = "hslpfgwmbvxkliszpbtx";
const NEW = "oachjythntjgynfoagvv";
const tNew = readFileSync("/tmp/sb_token_v2", "utf8").trim();
const kOld = JSON.parse(readFileSync("/tmp/sb_keys_OLD.json", "utf8"));
const kNew = JSON.parse(readFileSync("/tmp/sb_keys_NEW.json", "utf8"));

async function mgmt(path, opts = {}) {
  const r = await fetch(`https://api.supabase.com/v1${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${tNew}`, ...(opts.headers ?? {}) },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status}: ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}
async function storage(ref, key, path, opts = {}) {
  const r = await fetch(`https://${ref}.supabase.co/storage/v1${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${key}`, apikey: key, ...(opts.headers ?? {}) },
  });
  const t = await r.text();
  if (!r.ok && r.status !== 200) throw new Error(`${r.status}: ${t.slice(0, 300)}`);
  return { status: r.status, body: t };
}

async function main() {
  // 1. Recreate bucket via storage REST (service key) — idempotent
  const existing = await mgmt(`/projects/${NEW}/storage/buckets`);
  if (!existing.some((b) => b.id === "documents")) {
    const r = await fetch(`https://${NEW}.supabase.co/storage/v1/bucket`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kNew.service_role}`,
        apikey: kNew.service_role,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: "documents",
        name: "documents",
        public: false,
        file_size_limit: null,
        allowed_mime_types: null,
      }),
    });
    const b = await r.text();
    if (!r.ok) throw new Error(`création bucket: ${r.status}: ${b.slice(0, 300)}`);
    console.log("bucket documents créé sur NEW");
  } else {
    console.log("bucket documents déjà présent sur NEW");
  }

  // 2. Lister les objets côté OLD
  let all = [];
  let cursor;
  do {
    const q = new URLSearchParams({ limit: "1000" });
    if (cursor) q.set("cursor", cursor);
    const res = await storage(kOld.default ?? kOld.service_role, OLD, `/object/list/documents?${q}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: "", limit: 1000 }),
    });
    const arr = JSON.parse(res.body);
    all = all.concat(arr.filter((o) => !o.id.endsWith("/")));
    cursor = null; // API v1 list pagination via offset
    break;
  } while (cursor);
  console.log("objets OLD:", all.length);

  let ok = 0;
  for (const o of all) {
    // download
    const dl = await fetch(`https://${OLD}.supabase.co/storage/v1/object/${encodeURIComponent(o.name)}`, {
      headers: { Authorization: `Bearer ${kOld.default ?? kOld.service_role}`, apikey: kOld.default ?? kOld.service_role },
    });
    if (!dl.ok) {
      console.log("ÉCHEC download", o.name, dl.status);
      continue;
    }
    const buf = Buffer.from(await dl.arrayBuffer());
    // upload on NEW (upsert)
    const up = await fetch(`https://${NEW}.supabase.co/storage/v1/object/documents/${encodeURIComponent(o.name)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${kNew.service_role}`,
        apikey: kNew.service_role,
        "Content-Type": o.metadata?.mimetype ?? "application/octet-stream",
        "x-upsert": "true",
      },
      body: buf,
    });
    if (!up.ok) {
      console.log("ÉCHEC upload", o.name, up.status, (await up.text()).slice(0, 200));
      continue;
    }
    ok++;
  }
  console.log(`copiés: ${ok}/${all.length}`);
}

main().catch((e) => {
  console.error("ERREUR:", e.message);
  process.exit(1);
});
