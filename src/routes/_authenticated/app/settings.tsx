import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createCompanyUser, deleteCompanyUser } from "@/lib/admin-users.functions";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Loader2, Settings as SettingsIcon, ShieldCheck, UserPlus, XCircle, Search, Users, RefreshCw, Save, Bell, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { recordAudit } from "@/lib/audit";
import { TEMPLATE_DEFAULTS, TEMPLATE_LABELS } from "@/lib/notification-templates";
import { useTranslation } from "react-i18next";

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

type Profile = { id: string; full_name: string; email: string; phone: string | null; knock_user_id?: string | null };
type UserRole = { id: string; user_id: string; role: string };
type CheckResult = { name: string; ok: boolean; message: string };

function SettingsPage() {
  const { t } = useTranslation();
  const { isAdmin, hasRole } = useAuth();
  const canManageUsers = isAdmin || hasRole("director", "hr_manager");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><SettingsIcon className="h-5 w-5" /></span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("d.settings.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("d.settings.description")}</p>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">{t("d.settings.my_profile")}</TabsTrigger>
          <TabsTrigger value="users">{t("d.settings.users_roles")}</TabsTrigger>
          {isAdmin && <TabsTrigger value="permissions">{t("d.settings.permissions")}</TabsTrigger>}
          <TabsTrigger value="payroll">{t("d.settings.payroll_rules")}</TabsTrigger>
          <TabsTrigger value="company">{t("d.settings.company")}</TabsTrigger>
          {isAdmin && <TabsTrigger value="notifications">{t("d.settings.notifications")}</TabsTrigger>}
          {isAdmin && <TabsTrigger value="checks">{t("d.settings.upload_checks")}</TabsTrigger>}
          {isAdmin && <TabsTrigger value="audit">{t("d.settings.audit_log")}</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile"><ProfileTab /></TabsContent>
        <TabsContent value="users">        {canManageUsers ? <UsersTab /> : <div className="text-sm text-muted-foreground">{t("d.settings.admins_only")}</div>}</TabsContent>
        {isAdmin && <TabsContent value="permissions"><PermissionsTab /></TabsContent>}
        <TabsContent value="payroll"><PayrollRulesTab /></TabsContent>
        <TabsContent value="company"><CompanyTab /></TabsContent>
        {isAdmin && <TabsContent value="notifications"><NotificationsTab /></TabsContent>}
        {isAdmin && <TabsContent value="checks"><UploadChecksTab /></TabsContent>}
        {isAdmin && <TabsContent value="audit"><AuditTab /></TabsContent>}
      </Tabs>
    </div>
  );
}

function UploadChecksTab() {
  const { t } = useTranslation();
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

      toast.success(t("d.settings.checks_completed"));
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" /> {t("d.settings.upload_permissions")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <Label>{t("d.settings.upload_permissions")}</Label>
            <Select value={projectId || projects?.[0]?.id || ""} onValueChange={setProjectId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={t("d.settings.select_project")} /></SelectTrigger>
              <SelectContent>{(projects ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={runChecks} disabled={running || !profile?.company_id}>{running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />} {t("d.settings.run_checks")}</Button>
          </div>
        </div>
        <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          {t("d.settings.current_role_set")}: {roles.length ? roles.join(", ") : "—"}. {t("d.settings.checks_desc")}
        </div>
        <div className="space-y-2">
          {results.map((r) => (
            <div key={r.name} className="flex items-start gap-3 rounded-md border border-border p-3">
              {r.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" /> : <XCircle className="mt-0.5 h-4 w-4 text-destructive" />}
              <div className="min-w-0 flex-1">
                <div className="font-medium">{r.name}</div>
                <div className="break-words text-xs text-muted-foreground">{r.message}</div>
              </div>
              <Badge variant={r.ok ? "secondary" : "destructive"}>{r.ok ? t("d.settings.pass") : t("d.settings.fail")}</Badge>
            </div>
          ))}
          {results.length === 0 && <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{t("d.settings.checks_desc")}</div>}
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
  const { t } = useTranslation();
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
        <CardTitle className="text-base">{t("d.settings.recent_activity")} ({rows.length})</CardTitle>
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
              <th className="px-4 py-2">{t("d.settings.when")}</th>
              <th className="px-4 py-2">{t("d.settings.actor")}</th>
              <th className="px-4 py-2">{t("d.settings.action")}</th>
              <th className="px-4 py-2">{t("d.settings.target")}</th>
              <th className="px-4 py-2">{t("d.settings.details")}</th>
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
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">{t("d.settings.no_activity")}</td></tr>}

          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function ProfileTab() {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const [v, setV] = useState({ full_name: profile?.full_name ?? "", phone: profile?.phone ?? "" });
  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update(v).eq("id", user.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["auth-profile"] });
    toast.success(t("d.settings.profile_updated"));
  };
  return (
    <Card><CardHeader>          <CardTitle className="text-base">{t("d.settings.my_profile")}</CardTitle></CardHeader><CardContent className="space-y-3 max-w-lg">
      <div><Label>{t("d.common.email")}</Label><Input value={profile?.email ?? ""} disabled className="mt-1" /></div>
      <div><Label>{t("d.common.full_name")}</Label><Input value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} className="mt-1" /></div>
      <div><Label>{t("d.common.phone")}</Label><Input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} className="mt-1" /></div>
      <Button onClick={save}>{t("d.common.save")}</Button>
    </CardContent></Card>
  );
}

function UsersTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const createUser = useServerFn(createCompanyUser);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deleteUserFn = useServerFn(deleteCompanyUser);
  const [draft, setDraft] = useState({ email: "", password: "", fullName: "", phone: "", role: "employee", employeeId: "", clientId: "" });
  const { data: profiles } = useQuery({
    queryKey: ["company-profiles"],
    queryFn: async () => { const { data } = await supabase.from("profiles" as never).select("id,full_name,email,phone" as never); return (data ?? []) as unknown as Profile[]; },
  });

  const saveKnockId = async (userId: string, knockId: string) => {
    const { error } = await supabase.from("profiles" as never).update({ knock_user_id: knockId || null } as never).eq("id", userId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["company-profiles"] });
    toast.success(t("d.settings.knock_id_saved"));
  };
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
    toast.success(t("d.settings.role_assigned"));
  };
  const removeRole = async (id: string) => {
    const target = (roles ?? []).find((r) => r.id === id);
    await supabase.from("user_roles").delete().eq("id", id);
    if (target) {
      await recordAudit({ action: "role.remove", entity_type: "user", entity_id: target.user_id, metadata: { role: target.role } });
    }
    qc.invalidateQueries({ queryKey: ["all-roles"] });
  };

  const submitDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUserFn({ data: { userId: deleteTarget.id } });
      toast.success(t("d.settings.user_deleted") || "User deleted");
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["company-profiles"] });
      qc.invalidateQueries({ queryKey: ["all-roles"] });
      qc.invalidateQueries({ queryKey: ["employees-user-link"] });
      qc.invalidateQueries({ queryKey: ["clients-user-link"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  };

  const submitCreate = async () => {
    setCreating(true);
    try {
      await createUser({ data: draft });
      toast.success(t("d.settings.user_created"));
      setCreateOpen(false);
      setDraft({ email: "", password: "", fullName: "", phone: "", role: "employee", employeeId: "", clientId: "" });
      qc.invalidateQueries({ queryKey: ["company-profiles"] });
      qc.invalidateQueries({ queryKey: ["all-roles"] });
      qc.invalidateQueries({ queryKey: ["employees-user-link"] });
      qc.invalidateQueries({ queryKey: ["clients-user-link"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("d.settings.create_error"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card><CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle className="text-base">{t("d.settings.users_roles")}</CardTitle><Button size="sm" onClick={() => setCreateOpen(true)}><UserPlus className="mr-2 h-4 w-4" /> {t("d.settings.create_user")}</Button></CardHeader><CardContent className="space-y-3">
      <div className="space-y-2">
        {(profiles ?? []).map((p) => (
          <div key={p.id} className="rounded-md border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium">{p.full_name ?? p.email}</div>
                <div className="text-xs text-muted-foreground">{p.email}</div>
                <div className="text-[10px] text-muted-foreground">ID: {p.id.slice(0, 8)}…</div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Knock ID:</span>
                  <Input
                    className="h-7 w-48 text-xs"
                    placeholder="knock_user_xxx"
                    defaultValue={p.knock_user_id ?? ""}
                    onBlur={(e) => saveKnockId(p.id, e.target.value)}
                  />
                  {p.knock_user_id && <span className="text-xs text-success">✓</span>}
                </div>
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
                <Button size="sm" variant="destructive" className="h-8 px-2" onClick={() => setDeleteTarget(p)} title="Delete user">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("d.settings.create_user_account")}</DialogTitle>
            <DialogDescription>{t("d.settings.create_description")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>{t("d.common.full_name")}</Label><Input className="mt-1" value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} /></div>
            <div><Label>{t("d.common.email")}</Label><Input className="mt-1" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
            <div><Label>{t("d.settings.temporary_password")}</Label><Input className="mt-1" type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} /></div>
            <div><Label>{t("d.common.phone")}</Label><Input className="mt-1" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></div>
            <div><Label>{t("d.common.role")}</Label><Select value={draft.role} onValueChange={(role) => setDraft({ ...draft, role })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>{t("d.settings.link_employee")}</Label><Select value={draft.employeeId || "none"} onValueChange={(employeeId) => setDraft({ ...draft, employeeId: employeeId === "none" ? "" : employeeId })}><SelectTrigger className="mt-1"><SelectValue placeholder="Optional" /></SelectTrigger>              <SelectContent><SelectItem value="none">{t("d.settings.no_employee_link")}</SelectItem>{(employees ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent></Select></div>
            <div className="sm:col-span-2"><Label>{t("d.settings.link_client")}</Label><Select value={draft.clientId || "none"} onValueChange={(clientId) => setDraft({ ...draft, clientId: clientId === "none" ? "" : clientId, role: clientId === "none" ? draft.role : "client" })}><SelectTrigger className="mt-1"><SelectValue placeholder="Optional" /></SelectTrigger>              <SelectContent><SelectItem value="none">{t("d.settings.no_client_link")}</SelectItem>{(clients ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name} {c.email ? `· ${c.email}` : ""}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t("d.common.cancel")}</Button>
            <Button onClick={submitCreate} disabled={creating || !draft.email || !draft.password || !draft.fullName}>{creating ? t("d.settings.creating") : t("d.settings.create_account")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.full_name ?? deleteTarget?.email}</strong>? This will permanently remove their account, roles, and unlink them from any employee or client records. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={submitDelete} disabled={deleting}>{deleting ? "Deleting…" : "Delete User"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CardContent></Card>
  );
}

function PayrollRulesTab() {
  const { t } = useTranslation();
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
    toast.success(t("d.settings.rules_saved"));
  };
  const num = (k: string) => (
    <div><Label>{k.replace(/_/g, " ")}</Label>
      <Input type="number" step="0.01" className="mt-1" value={String(cur[k] ?? "")} onChange={(e) => setV({ ...v, [k]: Number(e.target.value) })} />
    </div>
  );
  return (
    <Card><CardHeader>        <CardTitle className="text-base">{t("d.settings.payroll_rules")}</CardTitle></CardHeader>
      <CardContent className="grid gap-3 max-w-2xl sm:grid-cols-2">
        {num("standard_hours_per_day")}
        {num("working_days_per_month")}
        {num("overtime_multiplier")}
        {num("late_penalty_per_hour")}
        {num("absence_deduction_per_day")}
        {num("tax_rate")}
        <div className="sm:col-span-2"><Label>{t("d.settings.currency")}</Label>
          <Input className="mt-1" value={String(cur.currency ?? "USD")} onChange={(e) => setV({ ...v, currency: e.target.value })} />
        </div>
        <div className="sm:col-span-2"><Button onClick={save}>{t("d.settings.save_rules")}</Button></div>
      </CardContent>
    </Card>
  );
}

function CompanyTab() {
  const { t } = useTranslation();
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
    toast.success(t("d.settings.saved"));
  };
  return (
    <Card><CardHeader><CardTitle className="text-base">{t("d.settings.company")}</CardTitle></CardHeader>
      <CardContent className="grid gap-3 max-w-2xl sm:grid-cols-2">
        {["name", "email", "phone", "address", "tax_number"].map((k) => (
          <div key={k} className={k === "address" ? "sm:col-span-2" : ""}><Label>{t("d.common." + k) || k.replace("_", " ")}</Label>
            <Input className="mt-1" value={String(cur[k] ?? "")} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
          </div>
        ))}
        <div className="sm:col-span-2"><Button onClick={save}>{t("d.common.save")}</Button></div>
      </CardContent>
    </Card>
  );
}

// ==================== Notifications Tab ====================

type ReminderSettingsRow = {
  id?: string;
  company_id: string;
  enabled: boolean;
  due_soon_days: number;
  overdue_first_days: number;
  overdue_followup_days: number;
  overdue_final_days: number;
  recipient_roles: string[];
};

const ALL_ROLES = ["super_admin", "company_owner", "director", "project_manager", "site_engineer", "accountant", "hr_manager", "procurement_officer", "store_manager", "employee"] as const;

type NotifTypeSettingsRow = {
  id?: string;
  company_id: string;
  type_key: string;
  enabled: boolean;
  send_email: boolean;
  send_in_app: boolean;
  recipient_roles: string[];
};

type NotificationTemplateRow = {
  id?: string;
  company_id: string;
  template_key: string;
  subject: string;
  body: string;
  enabled: boolean;
};

// Labels use i18n keys: d.settings.notif_type_*
const NOTIF_TYPE_KEYS: Record<string, string> = {
  task_assigned: "d.settings.notif_type_task_assigned",
  task_status_changed: "d.settings.notif_type_task_status_changed",
  invoice_due: "d.settings.notif_type_invoice_due",
  invoice_overdue: "d.settings.notif_type_invoice_overdue",
  requisition_approval: "d.settings.notif_type_requisition_approval",
};

const NOTIF_TYPE_ICONS: Record<string, string> = {
  task_assigned: "📋",
  task_status_changed: "🔄",
  invoice_due: "📧",
  invoice_overdue: "🔴",
  requisition_approval: "✅",
};

function NotificationsTab() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<"reminders" | "types" | "templates">("reminders");
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplateRow | null>(null);
  const [templateChanges, setTemplateChanges] = useState<Map<string, Partial<NotificationTemplateRow>>>(new Map());
  const [typeChanges, setTypeChanges] = useState<Map<string, Partial<NotifTypeSettingsRow>>>(new Map());

  // Invoice reminder settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["reminder-settings"],
    queryFn: async () => {
      if (!profile?.company_id) return null;
      try {
        const { data, error } = await supabase
          .from("reminder_settings" as never)
          .select("*" as never)
          .eq("company_id" as never, profile.company_id)
          .maybeSingle();
        if (error || !data) return null;
        return data as unknown as ReminderSettingsRow;
      } catch {
        return null;
      }
    },
    enabled: !!profile?.company_id,
  });

  // Notification type settings
  const { data: typeSettings, refetch: refetchTypes } = useQuery({
    queryKey: ["notification-type-settings"],
    queryFn: async () => {
      if (!profile?.company_id) return [] as NotifTypeSettingsRow[];
      try {
        const { data, error } = await supabase
          .from("notification_type_settings" as never)
          .select("*" as never)
          .eq("company_id" as never, profile.company_id)
          .order("type_key");
        if (error || !data) return [] as NotifTypeSettingsRow[];
        return data as unknown as NotifTypeSettingsRow[];
      } catch {
        return [] as NotifTypeSettingsRow[];
      }
    },
    enabled: !!profile?.company_id,
  });

  // Notification templates
  const { data: templates, refetch: refetchTemplates } = useQuery({
    queryKey: ["notification-templates"],
    queryFn: async () => {
      if (!profile?.company_id) return [] as NotificationTemplateRow[];
      try {
        const { data, error } = await supabase
          .from("notification_templates" as never)
          .select("*" as never)
          .eq("company_id" as never, profile.company_id)
          .order("template_key");
        if (error || !data) return [] as NotificationTemplateRow[];
        return data as unknown as NotificationTemplateRow[];
      } catch {
        return [] as NotificationTemplateRow[];
      }
    },
    enabled: !!profile?.company_id,
  });

  // --- Invoice reminder settings ---
  const [local, setLocal] = useState<Partial<ReminderSettingsRow>>({});
  const cur: ReminderSettingsRow = {
    company_id: profile?.company_id ?? "",
    enabled: true,
    due_soon_days: 3,
    overdue_first_days: 1,
    overdue_followup_days: 7,
    overdue_final_days: 30,
    recipient_roles: ["super_admin", "company_owner", "director", "accountant"],
    ...settings,
    ...local,
  };

  const update = (patch: Partial<ReminderSettingsRow>) => setLocal((prev) => ({ ...prev, ...patch }));

  const toggleRole = (role: string) => {
    const roles = cur.recipient_roles.includes(role)
      ? cur.recipient_roles.filter((r) => r !== role)
      : [...cur.recipient_roles, role];
    update({ recipient_roles: roles });
  };

  // --- Notification type toggle logic ---
  const getTypeSetting = (typeKey: string): NotifTypeSettingsRow => {
    const existing = typeSettings?.find((t) => t.type_key === typeKey);
    const changes = typeChanges.get(typeKey) ?? {};
    return {
      company_id: profile?.company_id ?? "",
      type_key: typeKey,
      enabled: true,
      send_email: true,
      send_in_app: true,
      recipient_roles: ["super_admin", "company_owner", "director"],
      ...existing,
      ...changes,
    };
  };

  const updateTypeSetting = (typeKey: string, patch: Partial<NotifTypeSettingsRow>) => {
    setTypeChanges((prev) => {
      const next = new Map(prev);
      next.set(typeKey, { ...(next.get(typeKey) ?? {}), ...patch });
      return next;
    });
  };

  const toggleTypeRole = (typeKey: string, role: string) => {
    const setting = getTypeSetting(typeKey);
    const roles = setting.recipient_roles.includes(role)
      ? setting.recipient_roles.filter((r) => r !== role)
      : [...setting.recipient_roles, role];
    updateTypeSetting(typeKey, { recipient_roles: roles });
  };

  // --- Template editing logic ---
  const getTemplate = (key: string): NotificationTemplateRow => {
    const existing = templates?.find((t) => t.template_key === key);
    const changes = templateChanges.get(key) ?? {};
    const defaults = TEMPLATE_DEFAULTS[key];
    return {
      company_id: profile?.company_id ?? "",
      template_key: key,
      subject: defaults?.subject ?? key,
      body: defaults?.body ?? "",
      enabled: true,
      ...existing,
      ...changes,
    };
  };

  const updateTemplate = (key: string, patch: Partial<NotificationTemplateRow>) => {
    setTemplateChanges((prev) => {
      const next = new Map(prev);
      next.set(key, { ...(next.get(key) ?? {}), ...patch });
      return next;
    });
  };

  // --- Save all settings ---
  const saveAll = async () => {
    if (!profile?.company_id) return;
    setSaving(true);
    try {
      // 1. Save invoice reminder settings
      const reminderPayload = {
        company_id: profile.company_id,
        enabled: cur.enabled,
        due_soon_days: cur.due_soon_days,
        overdue_first_days: cur.overdue_first_days,
        overdue_followup_days: cur.overdue_followup_days,
        overdue_final_days: cur.overdue_final_days,
        recipient_roles: cur.recipient_roles,
        updated_at: new Date().toISOString(),
      };

      if (settings?.id) {
        const { error } = await supabase
          .from("reminder_settings" as never)
          .update(reminderPayload as never)
          .eq("id" as never, settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("reminder_settings" as never)
          .insert(reminderPayload as never);
        if (error) throw error;
      }

      // 2. Save notification type settings
      for (const [typeKey, changes] of typeChanges.entries()) {
        const existing = typeSettings?.find((t) => t.type_key === typeKey);
        const payload = {
          company_id: profile.company_id,
          type_key: typeKey,
          enabled: changes.enabled ?? existing?.enabled ?? true,
          send_email: changes.send_email ?? existing?.send_email ?? true,
          send_in_app: changes.send_in_app ?? existing?.send_in_app ?? true,
          recipient_roles: changes.recipient_roles ?? existing?.recipient_roles ?? ["super_admin", "company_owner", "director"],
          updated_at: new Date().toISOString(),
        };

        if (existing?.id) {
          const { error } = await supabase
            .from("notification_type_settings" as never)
            .update(payload as never)
            .eq("id" as never, existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("notification_type_settings" as never)
            .insert(payload as never);
          if (error) throw error;
        }
      }

      // 3. Save notification templates
      for (const [templateKey, changes] of templateChanges.entries()) {
        const existing = templates?.find((t) => t.template_key === templateKey);
        const payload = {
          company_id: profile.company_id,
          template_key: templateKey,
          subject: changes.subject ?? existing?.subject ?? TEMPLATE_DEFAULTS[templateKey]?.subject ?? templateKey,
          body: changes.body ?? existing?.body ?? TEMPLATE_DEFAULTS[templateKey]?.body ?? "",
          enabled: changes.enabled ?? existing?.enabled ?? true,
          updated_at: new Date().toISOString(),
        };

        if (existing?.id) {
          const { error } = await supabase
            .from("notification_templates" as never)
            .update(payload as never)
            .eq("id" as never, existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("notification_templates" as never)
            .insert(payload as never);
          if (error) throw error;
        }
      }

      qc.invalidateQueries({ queryKey: ["reminder-settings"] });
      qc.invalidateQueries({ queryKey: ["notification-type-settings"] });
      qc.invalidateQueries({ queryKey: ["notification-templates"] });
      refetchTypes();
      refetchTemplates();
      toast.success(t("d.settings.notif_saved"));
      setLocal({});
      setTypeChanges(new Map());
      setTemplateChanges(new Map());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("d.settings.save_failed"));
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = local && Object.keys(local).length > 0 || typeChanges.size > 0 || templateChanges.size > 0;

  if (isLoading) {
    return <Card><CardContent className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveSection("reminders")}
          className={`rounded-md px-3 py-1.5 text-sm transition ${
            activeSection === "reminders" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("d.settings.invoice_reminders")}
        </button>
        <button
          onClick={() => setActiveSection("types")}
          className={`rounded-md px-3 py-1.5 text-sm transition ${
            activeSection === "types" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("d.settings.notification_types")}
        </button>
        <button
          onClick={() => setActiveSection("templates")}
          className={`rounded-md px-3 py-1.5 text-sm transition ${
            activeSection === "templates" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("d.settings.email_templates")}
        </button>
      </div>

      {/* Invoice Reminders Section */}
      {activeSection === "reminders" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4" /> Invoice Email Reminders</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("d.settings.reminders_desc")}
            </p>
          </CardHeader>
          <CardContent className="space-y-6 max-w-2xl">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <div className="font-medium">{t("d.settings.automatic_reminders")}</div>
                <div className="text-sm text-muted-foreground">
                  {cur.enabled ? t("d.settings.reminders_active") : t("d.settings.reminders_paused")}
                </div>
              </div>
              <Switch checked={cur.enabled} onCheckedChange={(v) => update({ enabled: v })} />
            </div>

            {/* Intervals */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Reminder Intervals</div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <Label className="text-sm">{t("d.settings.due_soon")}</Label>
                  <p className="text-xs text-muted-foreground">{t("d.settings.due_soon_desc")}</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      className="w-20"
                      value={cur.due_soon_days}
                      onChange={(e) => update({ due_soon_days: Number(e.target.value) || 3 })}
                    />
                    <span className="text-sm text-muted-foreground">{t("d.settings.days_before")}</span>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4 space-y-2">
                  <Label className="text-sm">{t("d.settings.first_overdue")}</Label>
                  <p className="text-xs text-muted-foreground">{t("d.settings.first_overdue_desc")}</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      className="w-20"
                      value={cur.overdue_first_days}
                      onChange={(e) => update({ overdue_first_days: Number(e.target.value) || 1 })}
                    />
                    <span className="text-sm text-muted-foreground">{t("d.settings.days_overdue")}</span>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4 space-y-2">
                  <Label className="text-sm">{t("d.settings.followup")}</Label>
                  <p className="text-xs text-muted-foreground">{t("d.settings.followup_desc")}</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={2}
                      max={90}
                      className="w-20"
                      value={cur.overdue_followup_days}
                      onChange={(e) => update({ overdue_followup_days: Number(e.target.value) || 7 })}
                    />
                    <span className="text-sm text-muted-foreground">days overdue</span>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4 space-y-2">
                  <Label className="text-sm">{t("d.settings.final_notice")}</Label>
                  <p className="text-xs text-muted-foreground">{t("d.settings.final_notice_desc")}</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={7}
                      max={365}
                      className="w-20"
                      value={cur.overdue_final_days}
                      onChange={(e) => update({ overdue_final_days: Number(e.target.value) || 30 })}
                    />
                    <span className="text-sm text-muted-foreground">days overdue</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recipient Roles */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t("d.settings.email_recipients")}</div>
              <p className="text-xs text-muted-foreground">Select which roles receive invoice reminder emails.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {ALL_ROLES.map((role) => {
                  const active = cur.recipient_roles.includes(role);
                  return (
                    <button
                      key={role}
                      onClick={() => toggleRole(role)}
                      className={`flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition ${
                        active ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted"
                      }`}
                    >
                      <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition ${
                        active ? "border-primary bg-primary" : "border-muted-foreground/30"
                      }`}>
                        {active && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <span className="capitalize">{role.replace(/_/g, " ")}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <div className="text-sm font-medium">{t("d.settings.schedule_preview")}</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>📧 <strong>{t("d.settings.due_soon_short")}:</strong> {cur.due_soon_days} day{cur.due_soon_days !== 1 ? "s" : ""} before due date</div>
                <div>🔴 <strong>{t("d.settings.first_overdue_short")}:</strong> {cur.overdue_first_days} day{cur.overdue_first_days !== 1 ? "s" : ""} after due date</div>
                <div>🟡 <strong>{t("d.settings.followup_short")}:</strong> {cur.overdue_followup_days} days after due date</div>
                <div>🚨 <strong>{t("d.settings.final_notice_short")}:</strong> {cur.overdue_final_days} days after due date</div>
                <div>👥 <strong>{t("d.settings.recipients_short")}:</strong> {cur.recipient_roles.length > 0 ? cur.recipient_roles.map((r) => r.replace(/_/g, " ")).join(", ") : t("d.settings.none_selected")}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification Types Section */}
      {activeSection === "types" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">🔔 Notification Types</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("d.settings.notif_types_desc")}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(NOTIF_TYPE_KEYS).map(([typeKey, i18nKey]) => {
              const setting = getTypeSetting(typeKey);
              return (
                <div key={typeKey} className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{NOTIF_TYPE_ICONS[typeKey]}</span>
                      <div>
                        <div className="font-medium">{t(i18nKey)}</div>
                        <div className="text-xs text-muted-foreground">{typeKey}</div>
                      </div>
                    </div>
                    <Switch
                      checked={setting.enabled}
                      onCheckedChange={(v) => updateTypeSetting(typeKey, { enabled: v })}
                    />
                  </div>

                  {setting.enabled && (
                    <div className="grid gap-3 sm:grid-cols-2 pl-10">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">{t("d.settings.delivery_channels")}</Label>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-sm">
                            <Switch
                              checked={setting.send_email}
                              onCheckedChange={(v) => updateTypeSetting(typeKey, { send_email: v })}
                              className="scale-75"
                            />
                            📧 Email
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <Switch
                              checked={setting.send_in_app}
                              onCheckedChange={(v) => updateTypeSetting(typeKey, { send_in_app: v })}
                              className="scale-75"
                            />
                            🔔 In-app
                          </label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">{t("d.settings.recipients_label")}</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {ALL_ROLES.map((role) => {
                            const active = setting.recipient_roles.includes(role);
                            return (
                              <button
                                key={role}
                                onClick={() => toggleTypeRole(typeKey, role)}
                                className={`rounded-full border px-2 py-0.5 text-xs transition ${
                                  active ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                                }`}
                              >
                                {role.replace(/_/g, " ")}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Email Templates Section */}
      {activeSection === "templates" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">✏️ Email Templates</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("d.settings.email_template_desc")} Use &#123;&#123;variableName&#125;&#125; for dynamic content.
              Available variables depend on the notification type.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <strong>{t("d.settings.template_variables")}:</strong> {'{{taskName}}'}, {'{{projectName}}'}, {'{{dueDate}}'}, {'{{oldStatus}}'}, {'{{newStatus}}'}, {'{{invoiceNumber}}'}, {'{{amount}}'}, {'{{daysOverdue}}'}, {'{{requisitionNumber}}'} — Use &#123;&#123;#if variable&#125;&#125;...&#123;&#123;/if&#125;&#125; for conditional blocks.
            </div>

            {Object.entries(TEMPLATE_DEFAULTS).map(([templateKey, defaults]) => {
              const tpl = getTemplate(templateKey);
              return (
                <div key={templateKey} className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{templateKey}</Badge>
                      <span className="text-sm font-medium">{TEMPLATE_LABELS[templateKey] ?? templateKey}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Switch
                          checked={tpl.enabled}
                          onCheckedChange={(v) => updateTemplate(templateKey, { enabled: v })}
                          className="scale-75"
                        />
                        {t("d.settings.enabled")}
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">{t("d.settings.subject")}</Label>
                    <Input
                      value={tpl.subject}
                      onChange={(e) => updateTemplate(templateKey, { subject: e.target.value })}
                      placeholder={defaults.subject}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">{t("d.settings.body")}</Label>
                    <Textarea
                      value={tpl.body}
                      onChange={(e) => updateTemplate(templateKey, { body: e.target.value })}
                      placeholder={defaults.body}
                      rows={3}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Global Save Button */}
      <div className="flex items-center justify-end gap-3 sticky bottom-4 z-10">
        {(typeChanges.size > 0 || templateChanges.size > 0 || (local && Object.keys(local).length > 0)) && (
          <div className="text-xs text-muted-foreground bg-background/80 backdrop-blur rounded-md px-3 py-1.5 border border-border">
            {t("d.settings.unsaved_changes")}
          </div>
        )}
        <Button onClick={saveAll} disabled={saving} className="shadow-lg">
          <Save className="mr-2 h-4 w-4" />
          {saving ? t("d.settings.saving") : t("d.settings.save_all")}
        </Button>
      </div>
    </div>
  );
}

// ==================== Permissions Tab ====================

type PermissionKeyItem = { key: string; module: string; label: string; description: string | null };
type UserPermissionItem = { id: string; user_id: string; permission_key: string; granted: boolean };

const DEFAULT_PERMISSIONS: PermissionKeyItem[] = [
  { key: "dashboard.view", module: "dashboard", label: "View Dashboard", description: "Access the main dashboard" },
  { key: "projects.view", module: "projects", label: "View Projects", description: "See the projects list" },
  { key: "projects.create", module: "projects", label: "Create Projects", description: "Create new projects" },
  { key: "projects.edit", module: "projects", label: "Edit Projects", description: "Edit project details" },
  { key: "tasks.view", module: "tasks", label: "View Tasks", description: "See the task board" },
  { key: "tasks.create", module: "tasks", label: "Create Tasks", description: "Create new tasks" },
  { key: "tasks.edit", module: "tasks", label: "Edit Tasks", description: "Edit task details" },
  { key: "clients.view", module: "clients", label: "View Clients", description: "See the clients list" },
  { key: "clients.create", module: "clients", label: "Create Clients", description: "Create new clients" },
  { key: "employees.view", module: "employees", label: "View Employees", description: "See the employees list" },
  { key: "employees.edit", module: "employees", label: "Edit Employees", description: "Edit employee details" },
  { key: "finance.view", module: "finance", label: "View Finance", description: "See financial data" },
  { key: "finance.invoices", module: "finance", label: "Manage Invoices", description: "Create and edit invoices" },
  { key: "inventory.view", module: "inventory", label: "View Inventory", description: "See inventory levels" },
  { key: "inventory.edit", module: "inventory", label: "Edit Inventory", description: "Manage inventory items" },
  { key: "documents.view", module: "documents", label: "View Documents", description: "See document library" },
  { key: "documents.upload", module: "documents", label: "Upload Documents", description: "Upload new documents" },
  { key: "settings.view", module: "settings", label: "View Settings", description: "Access settings page" },
  { key: "settings.users", module: "settings", label: "Manage Users", description: "Create users and assign roles" },
  { key: "settings.permissions", module: "settings", label: "Manage Permissions", description: "Configure user permissions" },
];

function groupPermissions(keys: PermissionKeyItem[]) {
  const groups: Record<string, PermissionKeyItem[]> = {};
  keys.forEach((k) => {
    if (!groups[k.module]) groups[k.module] = [];
    groups[k.module].push(k);
  });
  return groups;
}

function PermissionsTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModule, setActiveModule] = useState<string>("dashboard");
  const [localPermissions, setLocalPermissions] = useState<Map<string, boolean>>(new Map());
  const [saving, setSaving] = useState(false);

  const { data: profiles } = useQuery({
    queryKey: ["perm-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email");
      return (data ?? []) as Profile[];
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["perm-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("id, user_id, role");
      return (data ?? []) as UserRole[];
    },
  });

  const { data: permissionKeys } = useQuery({
    queryKey: ["permission-keys"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("permission_keys" as never).select("key, module, label, description");
        if (error || !data) return DEFAULT_PERMISSIONS;
        return data as PermissionKeyItem[];
      } catch {
        return DEFAULT_PERMISSIONS;
      }
    },
  });

  const { data: userPermissions, refetch: refetchPermissions } = useQuery({
    queryKey: ["user-permissions", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      try {
        const { data, error } = await supabase
          .from("user_permissions" as never)
          .select("id, user_id, permission_key, granted")
          .eq("user_id" as never, selectedUserId as never);
        if (error || !data) return [];
        return data as UserPermissionItem[];
      } catch {
        return [];
      }
    },
    enabled: !!selectedUserId,
  });

  useMemo(() => {
    if (permissionKeys) {
      const map = new Map<string, boolean>();
      permissionKeys.forEach((k) => map.set(k.key, false));
      if (userPermissions) {
        userPermissions.forEach((p) => map.set(p.permission_key, p.granted));
      }
      setLocalPermissions(map);
    }
  }, [userPermissions, permissionKeys]);

  const selectedProfile = profiles?.find((p) => p.id === selectedUserId);
  const selectedRoles = roles?.filter((r) => r.user_id === selectedUserId) ?? [];
  const groupedPermissions = groupPermissions(permissionKeys ?? []);
  const modules = Object.keys(groupedPermissions);

  const filteredProfiles = profiles?.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.full_name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q);
  });

  const togglePermission = (key: string) => {
    setLocalPermissions((prev) => {
      const next = new Map(prev);
      next.set(key, !next.get(key));
      return next;
    });
  };

  const toggleModule = (module: string, value: boolean) => {
    setLocalPermissions((prev) => {
      const next = new Map(prev);
      groupedPermissions[module]?.forEach((k) => next.set(k.key, value));
      return next;
    });
  };

  const savePermissions = async () => {
    if (!selectedUserId || !user) return;
    setSaving(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
      if (!profile?.company_id) {
        toast.error(t("d.settings.no_company"));
        return;
      }
      await supabase.from("user_permissions" as never).delete().eq("user_id" as never, selectedUserId as never).eq("company_id" as never, profile.company_id as never);
      const grantedPermissions = Array.from(localPermissions.entries())
        .filter(([_, granted]) => granted)
        .map(([key]) => ({ user_id: selectedUserId, company_id: profile.company_id, permission_key: key, granted: true }));
      if (grantedPermissions.length > 0) {
        const { error } = await supabase.from("user_permissions" as never).insert(grantedPermissions as never);
        if (error) throw error;
      }
      toast.success(t("d.settings.permissions_saved"));
      refetchPermissions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const getModuleStatus = (module: string) => {
    const keys = groupedPermissions[module] ?? [];
    const grantedCount = keys.filter((k) => localPermissions.get(k.key)).length;
    if (grantedCount === 0) return "none";
    if (grantedCount === keys.length) return "all";
    return "partial";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" />{t("d.settings.user_permissions")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("d.settings.permissions_desc")}</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          {/* User list */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder={t("d.settings.search_users")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <div className="max-h-[400px] space-y-1 overflow-y-auto">
              {(filteredProfiles ?? []).map((p) => {
                const userRole = roles?.find((r) => r.user_id === p.id);
                const isSelected = selectedUserId === p.id;
                return (
                  <button key={p.id} onClick={() => setSelectedUserId(p.id)} className={`w-full rounded-lg p-2.5 text-left transition ${isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted border border-transparent"}`}>
                    <div className="text-sm font-medium truncate">{p.full_name || t("d.settings.unnamed")}</div>
                    <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                    {userRole && <Badge variant="secondary" className="mt-1 text-[10px]">{userRole.role.replace(/_/g, " ")}</Badge>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Permissions */}
          {!selectedUserId ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">{t("d.settings.select_user")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{selectedProfile?.full_name || selectedProfile?.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedRoles.length > 0 ? selectedRoles.map((r) => r.role.replace(/_/g, " ")).join(", ") : t("d.settings.no_role")}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => refetchPermissions()}><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh</Button>
                  <Button size="sm" onClick={savePermissions} disabled={saving}><Save className="mr-1.5 h-3.5 w-3.5" /> {saving ? t("d.settings.saving_dots") : t("d.common.save")}</Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {modules.map((mod) => (
                  <button key={mod} onClick={() => setActiveModule(mod)} className={`rounded-md px-2.5 py-1 text-xs transition ${activeModule === mod ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                    {mod.replace(/_/g, " ")}
                    {getModuleStatus(mod) === "all" && <CheckCircle2 className="ml-1 inline h-3 w-3" />}
                    {getModuleStatus(mod) === "partial" && <span className="ml-1 inline h-1.5 w-1.5 rounded-full bg-warning" />}
                  </button>
                ))}
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{activeModule.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {groupedPermissions[activeModule]?.filter((k) => localPermissions.get(k.key)).length ?? 0} / {groupedPermissions[activeModule]?.length ?? 0}
                    </span>
                    <Switch checked={getModuleStatus(activeModule) === "all"} onCheckedChange={(v) => toggleModule(activeModule, v)} />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(groupedPermissions[activeModule] ?? []).map((perm) => (
                    <div key={perm.key} className="flex items-center justify-between rounded-md border border-border p-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm">{perm.label}</div>
                        {perm.description && <div className="text-xs text-muted-foreground truncate">{perm.description}</div>}
                      </div>
                      <Switch checked={localPermissions.get(perm.key) ?? false} onCheckedChange={() => togglePermission(perm.key)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
