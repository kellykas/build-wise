/**
 * End-to-end verification that a signed-in account (admin/owner that ALSO holds
 * a client role) can really upload documents and client-portal progress photos.
 *
 * Requires an injected browser session. Skipped automatically when absent.
 */
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { buildProgressPhotoPath, buildStoragePath } from "../src/lib/upload";

const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
const sessionJson = process.env["LOVABLE_BROWSER_SUPABASE_SESSION_JSON"];
const token =
  process.env["LOVABLE_BROWSER_SUPABASE_ACCESS_TOKEN"] ??
  (sessionJson ? (JSON.parse(sessionJson) as { access_token?: string }).access_token : undefined);

const enabled = Boolean(url && key && token);

const supabase = enabled
  ? createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          headers.set("apikey", key!);
          headers.set("Authorization", `Bearer ${token}`);
          return fetch(input as RequestInfo, { ...init, headers });
        },
      },
    })
  : null;

const cleanup: Array<() => Promise<void>> = [];

afterAll(async () => {
  for (const fn of cleanup) await fn().catch(() => undefined);
});

describe.runIf(enabled)("multi-role upload permissions (live)", () => {
  it("resolves the signed-in profile and company", async () => {
    const { data } = await supabase!.auth.getUser();
    expect(data.user?.id).toBeTruthy();
    const { data: profile, error } = await supabase!
      .from("profiles")
      .select("id, company_id")
      .eq("id", data.user!.id)
      .maybeSingle();
    expect(error).toBeNull();
    expect(profile?.company_id).toBeTruthy();
  });

  it("uploads a document file and its database row", async () => {
    const { data: userRes } = await supabase!.auth.getUser();
    const uid = userRes.user!.id;
    const { data: profile } = await supabase!.from("profiles").select("company_id").eq("id", uid).maybeSingle();
    const companyId = profile!.company_id as string;

    const path = buildStoragePath({ companyId, projectId: null, folder: "Tests", fileName: "rls-check.txt" });
    const up = await supabase!.storage.from("documents").upload(path, new Blob(["rls"], { type: "text/plain" }), {
      contentType: "text/plain",
    });
    expect(up.error, up.error?.message).toBeNull();
    cleanup.push(async () => void (await supabase!.storage.from("documents").remove([path])));

    const ins = await supabase!
      .from("documents")
      .insert({
        company_id: companyId,
        name: "rls-check.txt",
        folder: "Tests",
        mime_type: "text/plain",
        size_bytes: 3,
        storage_path: path,
        uploaded_by: uid,
      } as never)
      .select("id")
      .single();
    expect(ins.error, ins.error?.message).toBeNull();
    const id = (ins.data as { id: string }).id;
    cleanup.push(async () => void (await supabase!.from("documents").delete().eq("id", id)));

    const signed = await supabase!.storage.from("documents").createSignedUrl(path, 60);
    expect(signed.error, signed.error?.message).toBeNull();
  });

  it("uploads a client portal progress photo for an accessible project", async () => {
    const { data: userRes } = await supabase!.auth.getUser();
    const uid = userRes.user!.id;
    const { data: profile } = await supabase!.from("profiles").select("company_id").eq("id", uid).maybeSingle();
    const companyId = profile!.company_id as string;
    const { data: projects } = await supabase!.from("projects").select("id").limit(1);
    if (!projects || projects.length === 0) return;
    const projectId = (projects[0] as { id: string }).id;

    const path = buildProgressPhotoPath({ companyId, projectId, fileName: "progress-check.png" });
    const up = await supabase!.storage.from("documents").upload(path, new Blob(["img"], { type: "image/png" }), {
      contentType: "image/png",
    });
    expect(up.error, up.error?.message).toBeNull();
    cleanup.push(async () => void (await supabase!.storage.from("documents").remove([path])));

    const ins = await supabase!
      .from("documents")
      .insert({
        company_id: companyId,
        project_id: projectId,
        name: "progress-check.png",
        folder: "Progression client",
        mime_type: "image/png",
        size_bytes: 3,
        storage_path: path,
        uploaded_by: uid,
      } as never)
      .select("id")
      .single();
    expect(ins.error, ins.error?.message).toBeNull();
    const id = (ins.data as { id: string }).id;
    cleanup.push(async () => void (await supabase!.from("documents").delete().eq("id", id)));

    const gallery = await supabase!
      .from("documents")
      .select("id")
      .eq("project_id", projectId)
      .eq("folder", "Progression client");
    expect(gallery.error).toBeNull();
    expect((gallery.data ?? []).some((d) => (d as { id: string }).id === id)).toBe(true);
  });

  it("records an audit entry for uploads", async () => {
    const { data: userRes } = await supabase!.auth.getUser();
    const uid = userRes.user!.id;
    const { data: profile } = await supabase!.from("profiles").select("company_id, email").eq("id", uid).maybeSingle();
    const ins = await supabase!
      .from("audit_logs" as never)
      .insert({
        company_id: (profile as { company_id: string }).company_id,
        actor_id: uid,
        actor_email: (profile as { email: string | null }).email,
        action: "document.upload",
        entity_type: "document",
        metadata: { test: true },
      } as never)
      .select("id")
      .single();
    expect(ins.error, ins.error?.message).toBeNull();
    const id = (ins.data as unknown as { id: string }).id;
    cleanup.push(async () => void (await supabase!.from("audit_logs" as never).delete().eq("id", id)));
  });
});
