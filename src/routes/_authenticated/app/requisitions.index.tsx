import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FileSpreadsheet, Plus, Search, Inbox } from "lucide-react";
import { StatusBadge, requisitionStatusMeta } from "@/components/app/StatusBadge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/requisitions/")({
  component: RequisitionsList,
});

type Tab = "all" | "draft" | "pending_pricing" | "in_progress" | "closed";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "draft", label: "À compléter" },
  { key: "pending_pricing", label: "À traiter" },
  { key: "in_progress", label: "En cours" },
  { key: "closed", label: "Clôturés" },
];

function RequisitionsList() {
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["requisitions", tab],
    queryFn: async () => {
      let q = supabase.from("requisitions").select("*, projects(name), demandeur:profiles!requisitions_demandeur_id_fkey(full_name), tarificateur:profiles!requisitions_tarificateur_id_fkey(full_name), validateur:profiles!requisitions_validateur_id_fkey(full_name), caissier:profiles!requisitions_caissier_id_fkey(full_name)").order("created_at", { ascending: false });
      if (tab !== "all") q = q.eq("status", tab);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (data ?? []).filter((r) =>
    !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.reference.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><FileSpreadsheet className="h-5 w-5" /></span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">États de besoin</h1>
            <p className="text-sm text-muted-foreground">Demandes internes, validation et décaissement.</p>
          </div>
        </div>
        <NewRequisitionDialog open={open} onOpenChange={setOpen} />
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher par titre ou n°…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 p-16 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground"><Inbox className="h-6 w-6" /></span>
              <div className="text-lg font-semibold">Aucun état de besoin</div>
              <p className="max-w-sm text-sm text-muted-foreground">Créez votre premier état de besoin pour démarrer le circuit de validation.</p>
              <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Nouveau</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Référence</th>
                    <th className="px-4 py-3 font-medium">Titre</th>
                    <th className="px-4 py-3 font-medium">Projet</th>
                    <th className="px-4 py-3 font-medium">Étape</th>
                    <th className="px-4 py-3 font-medium">Demandeur</th>
                    <th className="px-4 py-3 font-medium">Validateur</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r: any) => {
                    const meta = requisitionStatusMeta[r.status] ?? { label: r.status, tone: "neutral" as const };
                    return (
                      <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 cursor-pointer">
                        <td className="px-4 py-3">
                          <Link to="/app/requisitions/$id" params={{ id: r.id }} className="font-mono text-xs text-primary hover:underline">{r.reference}</Link>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <Link to="/app/requisitions/$id" params={{ id: r.id }} className="hover:underline">{r.title}</Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{r.projects?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.stage ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.demandeur?.full_name ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.validateur?.full_name ?? "—"}</td>
                        <td className="px-4 py-3 font-medium">${Number(r.total_amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3"><StatusBadge tone={meta.tone}>{meta.label}</StatusBadge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NewRequisitionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [stage, setStage] = useState("");
  const [classeur, setClasseur] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [tarificateurId, setTarificateurId] = useState<string>("");
  const [validateurId, setValidateurId] = useState<string>("");
  const [caissierId, setCaissierId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const { data: projects } = useQuery({
    queryKey: ["projects-min"],
    queryFn: async () => (await supabase.from("projects").select("id,name").order("name")).data ?? [],
  });
  const { data: profiles } = useQuery({
    queryKey: ["profiles-min"],
    queryFn: async () => (await supabase.from("profiles").select("id,full_name,email").order("full_name")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!profile?.company_id) throw new Error("No company");
      const ref = `EB-${Date.now().toString().slice(-6)}`;
      const { data, error } = await supabase.from("requisitions").insert({
        company_id: profile.company_id,
        reference: ref,
        title,
        stage: stage || null,
        classeur: classeur || null,
        project_id: projectId || null,
        demandeur_id: user!.id,
        tarificateur_id: tarificateurId || null,
        validateur_id: validateurId || null,
        caissier_id: caissierId || null,
        notes: notes || null,
        created_by: user!.id,
        status: "draft" as const,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("État de besoin créé");
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      onOpenChange(false);
      setTitle(""); setStage(""); setClasseur(""); setProjectId(""); setTarificateurId(""); setValidateurId(""); setCaissierId(""); setNotes("");
      navigate({ to: "/app/requisitions/$id", params: { id: data.id } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nouveau</Button></DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nouvel état de besoin</DialogTitle>
          <DialogDescription>Définissez le circuit de validation puis ajoutez les besoins dans la fiche.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Titre *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex. Carrelage — étage 3" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Étape</Label>
              <Input value={stage} onChange={(e) => setStage(e.target.value)} placeholder="Revêtement" />
            </div>
            <div className="grid gap-2">
              <Label>Classeur</Label>
              <Input value={classeur} onChange={(e) => setClasseur(e.target.value)} placeholder="Gombe actualisée" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Projet</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Choisir un projet" /></SelectTrigger>
              <SelectContent>{(projects ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Tarificateur", v: tarificateurId, set: setTarificateurId },
              { label: "Validateur", v: validateurId, set: setValidateurId },
              { label: "Caissier", v: caissierId, set: setCaissierId },
            ].map((f) => (
              <div key={f.label} className="grid gap-2">
                <Label>{f.label}</Label>
                <Select value={f.v} onValueChange={f.set}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{(profiles ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.email}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => create.mutate()} disabled={!title || create.isPending}>Créer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
