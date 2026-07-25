import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Calendar, MapPin, DollarSign, TrendingUp, Trash2, Users, Wallet, PiggyBank } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";


export const Route = createFileRoute("/_authenticated/app/projects/$id")({
  component: ProjectDetail,
});

type Project = {
  id: string; name: string; status: string; priority: string;
  budget: number; progress: number; location: string | null;
  start_date: string | null; end_date: string | null; description: string | null;
};

function ProjectDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Project | null>(null);

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Project;
    },
  });

  const { data: tasks } = useQuery({
    queryKey: ["project-tasks", id],
    queryFn: async () => (await supabase.from("tasks").select("*").eq("project_id", id)).data ?? [],
  });
  const { data: invoices } = useQuery({
    queryKey: ["project-invoices", id],
    queryFn: async () => (await supabase.from("invoices").select("*").eq("project_id", id)).data ?? [],
  });
  const { data: pos } = useQuery({
    queryKey: ["project-pos", id],
    queryFn: async () => (await supabase.from("purchase_orders").select("*").eq("project_id", id)).data ?? [],
  });

  useEffect(() => { if (project) setDraft(project); }, [project]);

  if (!project || !draft) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const update = async (patch: Record<string, unknown>) => {
    const { error } = await supabase.from("projects").update(patch as never).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["project", id] });
    qc.invalidateQueries({ queryKey: ["module", "projects"] });
    toast.success("Saved");
  };

  const totalSpent = ((pos ?? []) as Array<{ total_amount: number | null }>).reduce((s, p) => s + Number(p.total_amount || 0), 0);
  const tasksDone = ((tasks ?? []) as Array<{ status: string }>).filter((t) => t.status === "completed").length;
  const daysRemaining = draft.end_date ? Math.ceil((new Date(draft.end_date).getTime() - Date.now()) / 86400000) : null;
  const remainingBudget = Number(draft.budget || 0) - totalSpent;
  const spentPct = draft.budget ? Math.round((totalSpent / draft.budget) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/app/projects" })}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <AgentsDialog projectId={id} managerId={(project as unknown as { manager_id: string | null }).manager_id} />
          <Button variant="destructive" size="sm" onClick={async () => {
            if (!confirm("Delete this project?")) return;
            const { error } = await supabase.from("projects").delete().eq("id", id);
            if (error) return toast.error(error.message);
            toast.success("Project deleted");
            qc.invalidateQueries({ queryKey: ["module", "projects"] });
            navigate({ to: "/app/projects" });
          }}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
        </div>
      </div>


      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <Input className="text-2xl font-bold h-auto py-1 border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} onBlur={() => draft.name !== project.name && update({ name: draft.name })} />
                </div>
                <Select value={draft.status} onValueChange={(v) => { setDraft({ ...draft, status: v }); update({ status: v }); }}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["planning","in_progress","on_hold","completed","cancelled"].map((s) =>
                      <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Priority</Label>
                  <Select value={draft.priority} onValueChange={(v) => { setDraft({ ...draft, priority: v }); update({ priority: v }); }}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{["low","medium","high","urgent"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Location</Label>
                  <Input className="mt-1" value={draft.location ?? ""} onChange={(e) => setDraft({ ...draft, location: e.target.value })} onBlur={() => draft.location !== project.location && update({ location: draft.location })} />
                </div>
                <div>
                  <Label className="text-xs">Start date</Label>
                  <Input type="date" className="mt-1" value={draft.start_date ?? ""} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} onBlur={() => draft.start_date !== project.start_date && update({ start_date: draft.start_date })} />
                </div>
                <div>
                  <Label className="text-xs">End date</Label>
                  <Input type="date" className="mt-1" value={draft.end_date ?? ""} onChange={(e) => setDraft({ ...draft, end_date: e.target.value })} onBlur={() => draft.end_date !== project.end_date && update({ end_date: draft.end_date })} />
                </div>
                <div>
                  <Label className="text-xs">Budget</Label>
                  <Input type="number" className="mt-1" value={String(draft.budget ?? 0)} onChange={(e) => setDraft({ ...draft, budget: Number(e.target.value) })} onBlur={() => draft.budget !== project.budget && update({ budget: draft.budget })} />
                </div>
                <div>
                  <Label className="text-xs">Progress: {draft.progress}%</Label>
                  <input type="range" min={0} max={100} value={draft.progress} onChange={(e) => setDraft({ ...draft, progress: Number(e.target.value) })} onMouseUp={() => draft.progress !== project.progress && update({ progress: draft.progress })} onTouchEnd={() => draft.progress !== project.progress && update({ progress: draft.progress })} className="mt-3 w-full" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea className="mt-1" rows={4} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} onBlur={() => draft.description !== project.description && update({ description: draft.description })} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Tasks ({tasks?.length ?? 0})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(tasks ?? []).slice(0, 10).map((t: { id: string; name: string; status: string; priority: string }) => (
                <Link key={t.id} to="/app/tasks" className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-muted/40">
                  <div className="text-sm">{t.name}</div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{t.status}</Badge>
                  </div>
                </Link>
              ))}
              {(tasks?.length ?? 0) === 0 && <div className="text-sm text-muted-foreground">No tasks yet.</div>}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Invoices ({invoices?.length ?? 0})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {((invoices ?? []) as Array<{ id: string; invoice_number: string | null; amount: number; status: string }>).slice(0, 5).map((i) => (
                  <div key={i.id} className="flex justify-between text-sm"><span>{i.invoice_number}</span><span>${Number(i.amount).toLocaleString()} · {i.status}</span></div>
                ))}
                {(invoices?.length ?? 0) === 0 && <div className="text-sm text-muted-foreground">None.</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Purchase orders ({pos?.length ?? 0})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {((pos ?? []) as Array<{ id: string; po_number: string | null; total_amount: number | null; status: string }>).slice(0, 5).map((p) => (
                  <div key={p.id} className="flex justify-between text-sm"><span>{p.po_number}</span><span>${Number(p.total_amount).toLocaleString()} · {p.status}</span></div>
                ))}
                {(pos?.length ?? 0) === 0 && <div className="text-sm text-muted-foreground">None.</div>}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><DollarSign className="h-3.5 w-3.5" /> Budget initial</div>
            <div className="mt-1 text-xl font-bold">${Number(draft.budget).toLocaleString()}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wallet className="h-3.5 w-3.5" /> Budget dépensé</div>
            <div className="mt-1 text-xl font-bold text-amber-600">${totalSpent.toLocaleString()}</div>
            <div className="mt-2 text-xs text-muted-foreground">{spentPct}% du budget</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><PiggyBank className="h-3.5 w-3.5" /> Reste</div>
            <div className={`mt-1 text-xl font-bold ${remainingBudget < 0 ? "text-destructive" : "text-emerald-600"}`}>${remainingBudget.toLocaleString()}</div>
            <div className="mt-2 text-xs text-muted-foreground">{remainingBudget < 0 ? "Dépassement" : "Disponible"}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp className="h-3.5 w-3.5" /> Tâches</div>
            <div className="mt-1 text-xl font-bold">{tasksDone}/{tasks?.length ?? 0}</div>
            <div className="mt-2 text-xs text-muted-foreground">Terminées</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> Délai</div>
            <div className="mt-1 text-xl font-bold">{daysRemaining !== null ? `${daysRemaining} jours` : "—"}</div>
            <div className="mt-2 text-xs text-muted-foreground">{daysRemaining !== null && daysRemaining < 0 ? "En retard" : "restants"}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> Localisation</div>
            <div className="mt-1 text-sm">{draft.location ?? "—"}</div>
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}

function AgentsDialog({ projectId, managerId }: { projectId: string; managerId: string | null }) {
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [memberRole, setMemberRole] = useState("Membre du projet");
  const qc = useQueryClient();
  const { data: agents } = useQuery({
    queryKey: ["project-agents", projectId, managerId],
    enabled: open,
    queryFn: async () => {
      const [{ data: project }, { data: members }, { data: assigns }] = await Promise.all([
        supabase.from("projects").select("company_id").eq("id", projectId).single(),
        supabase.from("project_members" as never).select("id,user_id,role" as never).eq("project_id", projectId),
        supabase
        .from("task_assignments")
        .select("user_id, role, tasks!inner(project_id)")
        .eq("tasks.project_id", projectId),
      ]);
      const rows = (assigns ?? []) as { user_id: string; role: string }[];
      const explicitMembers = (members ?? []) as unknown as { id: string; user_id: string; role: string }[];
      const idSet = new Set<string>([...rows.map((r) => r.user_id), ...explicitMembers.map((m) => m.user_id)]);
      if (managerId) idSet.add(managerId);
      const ids = Array.from(idSet);
      if (ids.length === 0) return [];
      const [{ data: profs }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", ids),
        supabase.from("user_roles").select("user_id, role").in("user_id", ids),
      ]);
      const roleMap = new Map<string, string[]>();
      ((roles ?? []) as { user_id: string; role: string }[]).forEach((r) => {
        roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role]);
      });
      const taskRoleMap = new Map<string, Set<string>>();
      rows.forEach((r) => {
        const s = taskRoleMap.get(r.user_id) ?? new Set<string>();
        s.add(r.role);
        taskRoleMap.set(r.user_id, s);
      });
      return ((profs ?? []) as { id: string; full_name: string | null; email: string | null }[]).map((p) => ({
        ...p,
        companyId: (project as { company_id?: string } | null)?.company_id,
        membershipId: explicitMembers.find((m) => m.user_id === p.id)?.id ?? null,
        memberRole: explicitMembers.find((m) => m.user_id === p.id)?.role ?? null,
        isManager: p.id === managerId,
        appRoles: roleMap.get(p.id) ?? [],
        taskRoles: Array.from(taskRoleMap.get(p.id) ?? []),
      }));
    },
  });
  const { data: profiles } = useQuery({
    queryKey: ["project-member-candidates"],
    enabled: open,
    queryFn: async () => ((await supabase.from("profiles").select("id,full_name,email").order("full_name")).data ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>,
  });
  const addMember = async () => {
    if (!selectedUser) return;
    const { data: project } = await supabase.from("projects").select("company_id").eq("id", projectId).single();
    const companyId = (project as { company_id?: string } | null)?.company_id;
    if (!companyId) return toast.error("Project company not found");
    const { error } = await supabase.from("project_members" as never).insert({ company_id: companyId, project_id: projectId, user_id: selectedUser, role: memberRole } as never);
    if (error) return toast.error(error.message);
    setSelectedUser("");
    setMemberRole("Membre du projet");
    qc.invalidateQueries({ queryKey: ["project-agents", projectId, managerId] });
    toast.success("Personne ajoutée au projet");
  };
  const removeMember = async (membershipId: string | null) => {
    if (!membershipId) return;
    const { error } = await supabase.from("project_members" as never).delete().eq("id", membershipId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["project-agents", projectId, managerId] });
    toast.success("Personne retirée du projet");
  };
  const assignedIds = new Set((agents ?? []).map((a) => a.id));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Users className="mr-2 h-4 w-4" /> Agents attachés</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agents attachés au projet</DialogTitle>
          <DialogDescription>Ajoutez directement les employés, managers ou clients concernés par ce projet.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_180px_auto]">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger><SelectValue placeholder="Choisir une personne" /></SelectTrigger>
            <SelectContent>{(profiles ?? []).filter((p) => !assignedIds.has(p.id)).map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.email}</SelectItem>)}</SelectContent>
          </Select>
          <Input value={memberRole} onChange={(e) => setMemberRole(e.target.value)} placeholder="Rôle projet" />
          <Button onClick={addMember} disabled={!selectedUser}>Ajouter</Button>
        </div>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {!agents && <div className="text-sm text-muted-foreground">Chargement…</div>}
          {agents && agents.length === 0 && <div className="text-sm text-muted-foreground">Aucun agent affecté à ce projet pour le moment.</div>}
          {agents?.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
              <div>
                <div className="text-sm font-medium">{a.full_name ?? a.email}</div>
                <div className="text-xs text-muted-foreground">{a.email}</div>
              </div>
              <div className="flex flex-wrap justify-end gap-1">
                {a.isManager && <Badge>Chef de chantier</Badge>}
                {a.memberRole && <Badge variant="default" className="text-[10px]">{a.memberRole}</Badge>}
                {a.appRoles.map((r) => <Badge key={r} variant="secondary" className="text-[10px]">{r.replace(/_/g, " ")}</Badge>)}
                {a.taskRoles.map((r) => <Badge key={`t-${r}`} variant="outline" className="text-[10px]">{r}</Badge>)}
                {a.membershipId && <Button size="sm" variant="ghost" onClick={() => removeMember(a.membershipId)}>Retirer</Button>}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

