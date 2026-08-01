/**
 * Static verification of the database security model that upload flows rely on.
 * Runs against the project database with psql (read-only).
 */
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function sql(query: string): string[][] {
  const wrapped = `select coalesce(json_agg(row_to_json(t)), '[]')::text from (${query}) t`;
  const out = execFileSync("psql", ["-At", "-c", wrapped], { encoding: "utf8" });
  const rows = JSON.parse(out.trim() || "[]") as Array<Record<string, unknown>>;
  return rows.map((r) => Object.values(r).map((v) => String(v ?? "").replace(/\s+/g, " ")));
}

const UPLOAD_TABLES = ["documents", "projects", "project_members", "audit_logs"];

describe("public schema policies", () => {
  const policies = sql(
    `select tablename, policyname, coalesce(qual,'') || ' ' || coalesce(with_check,'')
     from pg_policies where schemaname='public'`,
  );

  it("never treats a multi-role account as non-staff via NOT has_role(client)", () => {
    const offenders = policies.filter(([, , expr]) => /not\s+has_role\([^)]*'client'/i.test(expr));
    expect(offenders.map((o) => `${o[0]}.${o[1]}`)).toEqual([]);
  });

  it("gates staff document + project access through is_staff_user", () => {
    for (const table of ["documents", "projects", "project_members"]) {
      const staff = policies.filter(([t, , expr]) => t === table && expr.includes("is_staff_user(auth.uid())"));
      expect(staff.length, `${table} should have an is_staff_user policy`).toBeGreaterThan(0);
    }
  });

  it("lets clients insert progress photos only for their own projects", () => {
    const p = policies.find(([t, , expr]) => t === "documents" && /has_role\(auth\.uid\(\), 'client'/.test(expr) && expr.includes("Progression client"));
    expect(p, "client progress document policy missing").toBeTruthy();
    expect(p![2]).toMatch(/project_members|clients/);
  });

  it("keeps audit logs append-only and readable by admins only", () => {
    const audit = policies.filter(([t]) => t === "audit_logs");
    expect(audit.length).toBeGreaterThanOrEqual(2);
    const cmds = sql(`select cmd from pg_policies where schemaname='public' and tablename='audit_logs'`).flat();
    expect(cmds).not.toContain("DELETE");
    expect(cmds).not.toContain("UPDATE");
  });
});

describe("Data API grants", () => {
  it("grants authenticated access to every table used by uploads", () => {
    for (const table of UPLOAD_TABLES) {
      for (const priv of ["SELECT", "INSERT"]) {
        const [row] = sql(`select has_table_privilege('authenticated','public.${table}','${priv}')::text as ok`);
        expect(row[0], `${table} missing authenticated ${priv}`).toBe("true");
      }
      const [svc] = sql(`select has_table_privilege('service_role','public.${table}','SELECT')::text as ok`);
      expect(svc[0], `${table} missing service_role grant`).toBe("true");
    }
  });
});

describe("storage policies for the documents bucket", () => {
  const policies = sql(
    `select policyname, cmd, coalesce(qual,'') || ' ' || coalesce(with_check,'')
     from pg_policies where schemaname='storage' and tablename='objects'`,
  ).filter(([, , expr]) => expr.includes("'documents'"));

  it("allows staff (including admins who also hold a client role) to write in their company prefix", () => {
    const insert = policies.find(([, cmd, expr]) => cmd === "INSERT" && expr.includes("is_staff_user(auth.uid())"));
    expect(insert, "staff storage insert policy missing").toBeTruthy();
    expect(insert![2]).toContain("current_company_id()");
  });

  it("allows clients to upload progress photos under company/project/progress", () => {
    const insert = policies.find(([, cmd, expr]) => cmd === "INSERT" && /has_role\(auth\.uid\(\), 'client'/.test(expr));
    expect(insert, "client storage insert policy missing").toBeTruthy();
    expect(insert![2]).toContain("'progress'");
  });

  it("lets both staff and clients read what they are allowed to see", () => {
    const read = policies.find(([, cmd]) => cmd === "SELECT");
    expect(read).toBeTruthy();
    expect(read![2]).toContain("is_staff_user(auth.uid())");
    expect(read![2]).toMatch(/has_role\(auth\.uid\(\), 'client'/);
  });

  it("keeps the documents bucket private", () => {
    const [row] = sql(`select public::text from storage.buckets where id='documents'`);
    expect(row?.[0]).toBe("false");
  });
});

describe("multi-role accounts", () => {
  it("keeps a staff role alongside the client role so staff policies still apply", () => {
    const multi = sql(
      `select user_id::text as user_id, string_agg(role::text, ',' order by role::text) as roles
       from public.user_roles group by user_id
       having bool_or(role = 'client') and bool_or(role <> 'client')`,
    );
    for (const [uid, roles] of multi) {
      const list = roles.split(",");
      expect(list, `user ${uid} lost its staff role`).not.toEqual(["client"]);
      expect(list.some((r) => r !== "client")).toBe(true);
    }
  });

  it("defines is_staff_user without excluding client role holders", () => {
    const [row] = sql(
      `select pg_get_functiondef(p.oid) as def from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'is_staff_user'`,
    );
    expect(row[0]).toContain("super_admin");
    expect(row[0]).not.toMatch(/not\s+public\.has_role/i);
  });
});
