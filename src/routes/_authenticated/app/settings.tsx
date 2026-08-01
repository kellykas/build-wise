import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createCompanyUser } from "@/lib/admin-users.functions";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Loader2, Settings as SettingsIcon, ShieldCheck, UserPlus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { recordAudit } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — BuildFlow ERP" },
      { name: "description", content: "Manage profiles, roles, payroll rules, company settings, audit logs and upload permission checks." },
      { property: "og:title", content: "Settings — BuildFlow ERP" },
      { property: "og:description", content: "Manage profiles, roles, payroll rules, company settings, audit logs and upload permission checks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const ROLES = ["super_admin", "company_owner", "director", "project_manager", "site_engineer", "accountant", "hr_manager", "procurement_officer", "store_manager", "employee", "client"] as const;

type Profile = { id: string; full_name: string; email: string; phone: string | null };
type UserRole = { id: string; user_id: string; role: string };
type CheckResult = { name: string; ok: boolean; message: string };

function SettingsPage() {
  const { isAdmin, hasRole } = useAuth();
  const canManageUsers = isAdmin || hasRole("director", "hr_manager");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><SettingsIcon className="h-5 w-5" /></span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Parameters</h1>
          <p className="text-sm text-muted-foreground">Profile, team & roles, payroll rules, company info.</p>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">My profile</TabsTrigger>
          <TabsTrigger value="users">Users & roles</TabsTrigger>
          <TabsTrigger value="payroll">Payroll rules</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          {isAdmin && <TabsTrigger value="checks">Upload checks</TabsTrigger>}
          {isAdmin && <TabsTrigger value="audit">Audit log</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile"><ProfileTab /></TabsContent>
        <TabsContent value="users">{canManageUsers ? <UsersTab /> : <div className="text-sm text-muted-foreground">Admins only.</div>}</TabsContent>
        <TabsContent value="payroll"><PayrollRulesTab /></TabsContent>
        <TabsContent value="company"><CompanyTab /></TabsContent>
        {isAdmin && <TabsContent value="checks"><UploadChecksTab /></TabsContent>}
        {isAdmin && <TabsContent value="audit"><AuditTab /></TabsContent>}
      </Tabs>
    </div>
  );
}

function UploadChecksTab() {
  const { profile, user, roles } = useAuth();
  const [projectId, setProjectId] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([]);

  const { data: projects } = useQuery({
    queryKey: ["upload-check-projects", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id,name").order("created_at", { ascending: false }).limit(25);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });

  const addResult = (result: CheckResult) => setResults((current) => [...current, result]);

  const cleanupDocument = async (id: string | null, path: string | null) => {
    if (id) await supabase.from("documents").delete().eq("id", id);
    if (path) await supabase.storage.from("documents").remove([path]);
  };

  const runChecks = async () => {
    if (!profile?.company_id || !user?.id) {
      toast.error("Your account is not linked to a company workspace.");
      return;
    }
    setRunning(true);
    setResults([]);
    const stamp = Date.now();
    const selectedProject = projectId || projects?.[0]?.id || "";

    try {
      const { error: projectReadError } = await supabase.from("projects").select("id,name").limit(1);
      addResult({ name: "Project page visibility", ok: !projectReadError, message: projectReadError?.message ?? "Projects are visible to this role." });

      const docPath = `${profile.company_id}/general/Permission checks/${stamp}-document-check.txt`;
      let docId: string | null = null;
      const docFile = new Blob([`BuildFlow upload check ${stamp}`], { type: "text/plain" });
      const docUpload = await supabase.storage.from("documents").upload(docPath, docFile, { contentType: "text/plain" });
      if (docUpload.error) {
        addResult({ name: "Document storage upload", ok: false, message: docUpload.error.message });
      } else {
        addResult({ name: "Document storage upload", ok: true, message: "Storage accepted a company document upload." });
        const docInsert = await supabase.from("documents").insert({
          company_id: profile.company_id,
          project_id: null,
          name: "permission-check.txt",
          folder: "Permission checks",
          mime_type: "text/plain",
          size_bytes: docFile.size,
          storage_path: docPath,
          uploaded_by: user.id,
        } as never).select("id").single();
        if (docInsert.error) {
          addResult({ name: "Document database RLS", ok: false, message: docInsert.error.message });
        } else {
          docId = (docInsert.data as { id: string }).id;
          addResult({ name: "Document database RLS", ok: true, message: "Database accepted the document record." });
          const signed = await supabase.storage.from("documents").createSignedUrl(docPath, 60);
          addResult({ name: "Document preview/download", ok: !signed.error, message: signed.error?.message ?? "Signed preview/download URL created." });
        }
      }
      await cleanupDocument(docId, docUpload.error ? null : docPath);

      if (!selectedProject) {
        addResult({ name: "Portal photo project", ok: false, message: "Create or select a project before testing portal photos." });
      } else {
        const photoPath = `${profile.company_id}/${selectedProject}/progress/${stamp}-portal-check.svg`;
        let photoId: string | null = null;
        const photoFile = new Blob(["<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'><rect width='16' height='16' fill='currentColor'/></svg>"], { type: "image/svg+xml" });
        const photoUpload = await supabase.storage.from("documents").upload(photoPath, photoFile, { contentType: "image/svg+xml" });
        if (photoUpload.error) {
          addResult({ name: "Portal photo storage upload", ok: false, message: photoUpload.error.message });
        } else {
          addResult({ name: "Portal photo storage upload", ok: true, message: "Storage accepted a portal progress photo." });
          const photoInsert = await supabase.from("documents").insert({
            company_id: profile.company_id,
            project_id: selectedProject,
            name: "portal-permission-check.svg",
            folder: "Progression client",
            mime_type: "image/svg+xml",
            size_bytes: photoFile.size,
            storage_path: photoPath,
            uploaded_by: user.id,
          } as never).select("id").single();
          if (photoInsert.error) {
            addResult({ name: "Portal photo database RLS", ok: false, message: photoInsert.error.message });
          } else {
            photoId = (photoInsert.data as { id: string }).id;
            addResult({ name: "Portal photo database RLS", ok: true, message: "Database accepted the portal photo record." });
            const photoRead = await supabase.from("documents").select("id").eq("id", photoId).single();
            addResult({ name: "Portal gallery visibility", ok: !photoRead.error, message: photoRead.error?.message ?? "The uploaded portal photo is readable for the gallery." });
          }
        }
        await cleanupDocument(photoId, photoUpload.error ? null : photoPath);
      }

      toast.success("Upload permission checks completed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" /> Upload permissions check</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <Label>Project for portal photo test</Label>
            <Select value={projectId || projects?.[0]?.id || ""} onValueChange={setProjectId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select a project" /></SelectTrigger>
              <SelectContent>{(projects ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={runChecks} disabled={running || !profile?.company_id}>{running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />} Run checks</Button>
          </div>
        </div>
        <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          Current role set: {roles.length ? roles.join(", ") : "none"}. The check uses your live session, creates temporary test files/records, verifies read and signed preview access, then removes them.
        </div>
        <div className="space-y-2">
          {results.map((r) => (
            <div key={r.name} className="flex items-start gap-3 rounded-md border border-border p-3">
              {r.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" /> : <XCircle className="mt-0.5 h-4 w-4 text-destructive" />}
              <div className="min-w-0 flex-1">
                <div className="font-medium">{r.name}</div>
                <div className="break-words text-xs text-muted-foreground">{r.message}</div>
              </div>
              <Badge variant={r.ok ? "secondary" : "destructive"}>{r.ok ? "Pass" : "Fail"}</Badge>
            </div>
          ))}
          {results.length === 0 && <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Run the checks to validate uploads and visibility for your current role.</div>}
        </div>
      </CardContent>
    </Card>
  );
}

const AUDIT_FILTERS: Array<{ key: string; label: string; match: (a: string) => boolean }> = [
  { key: "all", label: "Tout", match: () => true },
  { key: "uploads", label: "Téléversements", match: (a) => a === "document.upload" || a === "portal.photo.upload" },
  { key: "documents", label: "Documents", match: (a) => a.startsWith("document.") },
  { key: "photos", label: "Photos portail", match: (a) => a.startsWith("portal.photo.") },
  { key: "access", label: "Utilisateurs & rôles", match: (a) => a.startsWith("user.") || a.startsWith("role.") || a.startsWith("project.member.") },
];

function AuditTab() {
  const [filter, setFilter] = useState("all");
  const { data: logs } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs" as never)
        .select("id, created_at, actor_email, action, entity_type, entity_id, metadata")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; created_at: string; actor_email: string | null; action: string; entity_type: string | null; entity_id: string | null; metadata: Record<string, unknown> }>;
    },
  });
  const active = AUDIT_FILTERS.find((f) => f.key === filter) ?? AUDIT_FILTERS[0];
  const rows = (logs ?? []).filter((l) => active.match(l.action));
  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="text-base">Recent activity ({rows.length})</CardTitle>
        <div className="flex flex-wrap gap-2">
          {AUDIT_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1 text-xs ${filter === f.key ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Actor</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Target</th>
              <th className="px-4 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => {
              const m = (l.metadata ?? {}) as { project_id?: string | null; company_id?: string | null; name?: string; path?: string };
              return (
                <tr key={l.id} className="border-b border-border last:border-0 align-top">
                  <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-xs">{l.actor_email ?? "—"}</td>
                  <td className="px-4 py-2"><Badge variant="outline">{l.action}</Badge></td>
                  <td className="px-4 py-2 text-xs">
                    {l.entity_type ?? "—"}{l.entity_id ? ` · ${l.entity_id.slice(0, 8)}` : ""}
                    {m.project_id ? <div className="text-muted-foreground">projet {String(m.project_id).slice(0, 8)}</div> : null}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground"><pre className="whitespace-pre-wrap break-all font-mono text-[10px]">{JSON.stringify(l.metadata)}</pre></td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No activity yet.</td></tr>}

          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function ProfileTab() {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const [v, setV] = useState({ full_name: profile?.full_name ?? "", phone: profile?.phone ?? "" });
  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update(v).eq("id", user.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["auth-profile"] });
    toast.success("Profile updated");
  };
  return (
    <Card><CardHeader><CardTitle className="text-base">My profile</CardTitle></CardHeader><CardContent className="space-y-3 max-w-lg">
      <div><Label>Email</Label><Input value={profile?.email ?? ""} disabled className="mt-1" /></div>
      <div><Label>Full name</Label><Input value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} className="mt-1" /></div>
      <div><Label>Phone</Label><Input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} className="mt-1" /></div>
      <Button onClick={save}>Save</Button>
    </CardContent></Card>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const createUser = useServerFn(createCompanyUser);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ email: "", password: "", fullName: "", phone: "", role: "employee", employeeId: "", clientId: "" });
  const { data: profiles } = useQuery({
    queryKey: ["company-profiles"],
    queryFn: async () => ((await supabase.from("profiles").select("id,full_name,email,phone")).data ?? []) as Profile[],
  });
  const { data: roles } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => ((await supabase.from("user_roles").select("id,user_id,role")).data ?? []) as UserRole[],
  });
  const { data: employees } = useQuery({
    queryKey: ["employees-user-link"],
    queryFn: async () => ((await supabase.from("employees").select("id,full_name,email,user_id").is("user_id", null).order("full_name")).data ?? []) as Array<{ id: string; full_name: string; email: string | null; user_id: string | null }>,
  });
  const { data: clients } = useQuery({
    queryKey: ["clients-user-link"],
    queryFn: async () => ((await supabase.from("clients").select("id,name,email,user_id").is("user_id", null).order("name")).data ?? []) as Array<{ id: string; name: string; email: string | null; user_id: string | null }>,
  });

  const rolesByUser = new Map<string, UserRole[]>();
  (roles ?? []).forEach((r) => { const arr = rolesByUser.get(r.user_id) ?? []; arr.push(r); rolesByUser.set(r.user_id, arr); });

  const assign = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as never });
    if (error) return toast.error(error.message);
    await recordAudit({ action: "role.assign", entity_type: "user", entity_id: userId, metadata: { role } });
    qc.invalidateQueries({ queryKey: ["all-roles"] });
    toast.success("Role assigned");
  };
  const removeRole = async (id: string) => {
    const target = (roles ?? []).find((r) => r.id === id);
    await supabase.from("user_roles").delete().eq("id", id);
    if (target) {
      await recordAudit({ action: "role.remove", entity_type: "user", entity_id: target.user_id, metadata: { role: target.role } });
    }
    qc.invalidateQueries({ queryKey: ["all-roles"] });
  };

  const submitCreate = async () => {
    setCreating(true);
    try {
      await createUser({ data: draft });
      toast.success("User created and role assigned");
      setCreateOpen(false);
      setDraft({ email: "", password: "", fullName: "", phone: "", role: "employee", employeeId: "", clientId: "" });
      qc.invalidateQueries({ queryKey: ["company-profiles"] });
      qc.invalidateQueries({ queryKey: ["all-roles"] });
      qc.invalidateQueries({ queryKey: ["employees-user-link"] });
      qc.invalidateQueries({ queryKey: ["clients-user-link"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create user");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card><CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle className="text-base">Team members</CardTitle><Button size="sm" onClick={() => setCreateOpen(true)}><UserPlus className="mr-2 h-4 w-4" /> Create user</Button></CardHeader><CardContent className="space-y-3">
      <div className="space-y-2">
        {(profiles ?? []).map((p) => (
          <div key={p.id} className="rounded-md border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium">{p.full_name ?? p.email}</div>
                <div className="text-xs text-muted-foreground">{p.email}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(rolesByUser.get(p.id) ?? []).map((r) => (
                  <Badge key={r.id} variant="secondary" className="gap-1">
                    {r.role}
                    <button onClick={() => removeRole(r.id)} className="ml-1 text-destructive hover:underline">×</button>
                  </Badge>
                ))}
                <Select onValueChange={(role) => assign(p.id, role)}>
                  <SelectTrigger className="h-8 w-44"><SelectValue placeholder="+ Assign role" /></SelectTrigger>
                  <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create user account</DialogTitle>
            <DialogDescription>Create staff or client access and link it to an employee/client record.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Full name</Label><Input className="mt-1" value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} /></div>
            <div><Label>Email</Label><Input className="mt-1" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
            <div><Label>Temporary password</Label><Input className="mt-1" type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} /></div>
            <div><Label>Phone</Label><Input className="mt-1" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></div>
            <div><Label>Role</Label><Select value={draft.role} onValueChange={(role) => setDraft({ ...draft, role })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Link employee</Label><Select value={draft.employeeId || "none"} onValueChange={(employeeId) => setDraft({ ...draft, employeeId: employeeId === "none" ? "" : employeeId })}><SelectTrigger className="mt-1"><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="none">No employee link</SelectItem>{(employees ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent></Select></div>
            <div className="sm:col-span-2"><Label>Link client portal</Label><Select value={draft.clientId || "none"} onValueChange={(clientId) => setDraft({ ...draft, clientId: clientId === "none" ? "" : clientId, role: clientId === "none" ? draft.role : "client" })}><SelectTrigger className="mt-1"><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="none">No client link</SelectItem>{(clients ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name} {c.email ? `· ${c.email}` : ""}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={submitCreate} disabled={creating || !draft.email || !draft.password || !draft.fullName}>{creating ? "Creating…" : "Create account"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CardContent></Card>
  );
}

function PayrollRulesTab() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { data: rules } = useQuery({
    queryKey: ["payroll-rules"],
    queryFn: async () => ((await supabase.from("payroll_rules").select("*").maybeSingle()).data),
  });
  const [v, setV] = useState<Record<string, unknown>>({});
  const cur = { ...rules, ...v } as Record<string, unknown>;
  const save = async () => {
    if (!profile?.company_id) return;
    const payload = { company_id: profile.company_id, ...(rules ?? {}), ...v };
    const q = rules ? supabase.from("payroll_rules").update(payload as never).eq("company_id", profile.company_id)
                    : supabase.from("payroll_rules").insert(payload as never);
    const { error } = await q;
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["payroll-rules"] });
    toast.success("Rules saved");
  };
  const num = (k: string) => (
    <div><Label>{k.replace(/_/g, " ")}</Label>
      <Input type="number" step="0.01" className="mt-1" value={String(cur[k] ?? "")} onChange={(e) => setV({ ...v, [k]: Number(e.target.value) })} />
    </div>
  );
  return (
    <Card><CardHeader><CardTitle className="text-base">Payroll rules</CardTitle></CardHeader>
      <CardContent className="grid gap-3 max-w-2xl sm:grid-cols-2">
        {num("standard_hours_per_day")}
        {num("working_days_per_month")}
        {num("overtime_multiplier")}
        {num("late_penalty_per_hour")}
        {num("absence_deduction_per_day")}
        {num("tax_rate")}
        <div className="sm:col-span-2"><Label>Currency</Label>
          <Input className="mt-1" value={String(cur.currency ?? "USD")} onChange={(e) => setV({ ...v, currency: e.target.value })} />
        </div>
        <div className="sm:col-span-2"><Button onClick={save}>Save rules</Button></div>
      </CardContent>
    </Card>
  );
}

function CompanyTab() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { data: c } = useQuery({
    queryKey: ["company", profile?.company_id],
    queryFn: async () => profile?.company_id ? (await supabase.from("companies").select("*").eq("id", profile.company_id).single()).data : null,
    enabled: !!profile?.company_id,
  });
  const [v, setV] = useState<Record<string, unknown>>({});
  const cur = { ...c, ...v } as Record<string, unknown>;
  const save = async () => {
    if (!profile?.company_id) return;
    const { error } = await supabase.from("companies").update(v as never).eq("id", profile.company_id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["company", profile.company_id] });
    toast.success("Saved");
  };
  return (
    <Card><CardHeader><CardTitle className="text-base">Company</CardTitle></CardHeader>
      <CardContent className="grid gap-3 max-w-2xl sm:grid-cols-2">
        {["name", "email", "phone", "address", "tax_number"].map((k) => (
          <div key={k} className={k === "address" ? "sm:col-span-2" : ""}><Label>{k.replace("_", " ")}</Label>
            <Input className="mt-1" value={String(cur[k] ?? "")} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
          </div>
        ))}
        <div className="sm:col-span-2"><Button onClick={save}>Save</Button></div>
      </CardContent>
    </Card>
  );
}
