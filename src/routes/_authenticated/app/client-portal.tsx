import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Upload, ImageIcon, Receipt, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { recordAudit } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/app/client-portal")({
  head: () => ({
    meta: [
      { title: "Client Portal — BuildFlow ERP" },
      { name: "description", content: "Client portal for project progress, photo galleries, invoices and company communication." },
      { property: "og:title", content: "Client Portal — BuildFlow ERP" },
      { property: "og:description", content: "Client portal for project progress, photo galleries, invoices and company communication." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientPortalPage,
});

type Project = { id: string; name: string; progress: number; status: string; location: string | null; end_date: string | null };
type ProgressPhoto = { id: string; name: string; storage_path: string; created_at: string };

const FOLDER = "Progression client";

function ClientPortalPage() {
  const { profile, user, isAdmin, hasRole } = useAuth();
  const qc = useQueryClient();
  const canUploadPhotos = isAdmin || hasRole("project_manager", "director", "client");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [signed, setSigned] = useState<Record<string, string>>({});

  const { data: projects } = useQuery({
    queryKey: ["portal-projects", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name, progress, status, location, end_date").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Project[];
    },
  });

  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProject) setSelectedProject(projects[0].id);
  }, [projects, selectedProject]);

  const { data: photos } = useQuery({
    queryKey: ["portal-photos", selectedProject],
    enabled: !!selectedProject,
    queryFn: async () => {
      const { data, error } = await supabase.from("documents")
        .select("id, name, storage_path, created_at")
        .eq("project_id", selectedProject)
        .eq("folder", FOLDER)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProgressPhoto[];
    },
  });

  const { data: invoices } = useQuery({
    queryKey: ["portal-invoices", selectedProject],
    enabled: !!selectedProject,
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*").eq("project_id", selectedProject).order("issue_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    (async () => {
      if (!photos || photos.length === 0) {
        setSigned({});
        return;
      }
      const paths = photos.map((p) => p.storage_path);
      const { data, error } = await supabase.storage.from("documents").createSignedUrls(paths, 3600);
      if (error) {
        toast.error(error.message);
        return;
      }
      const map: Record<string, string> = {};
      (data ?? []).forEach((s, i) => { if (s.signedUrl) map[paths[i]] = s.signedUrl; });
      setSigned(map);
    })();
  }, [photos]);

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !selectedProject || !profile?.company_id) return;
    if (!file.type.startsWith("image/")) return toast.error("Seules les images sont acceptées");
    setUploading(true);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${profile.company_id}/${selectedProject}/progress/${Date.now()}-${safe}`;
    const up = await supabase.storage.from("documents").upload(path, file, { contentType: file.type });
    if (up.error) { setUploading(false); return toast.error(up.error.message); }
    const ins = await supabase.from("documents").insert({
      company_id: profile.company_id,
      project_id: selectedProject,
      name: file.name,
      folder: FOLDER,
      mime_type: file.type,
      size_bytes: file.size,
      storage_path: path,
      uploaded_by: user?.id ?? null,
    } as never);
    setUploading(false);
    if (ins.error) {
      await supabase.storage.from("documents").remove([path]);
      return toast.error(ins.error.message);
    }
    await recordAudit({ action: "portal.photo.upload", entity_type: "project", entity_id: selectedProject, metadata: { name: file.name, size: file.size, path } });
    if (fileRef.current) fileRef.current.value = "";
    toast.success("Photo ajoutée");
    await qc.invalidateQueries({ queryKey: ["portal-photos", selectedProject] });
    qc.invalidateQueries({ queryKey: ["module:documents"] });
  };

  const current = projects?.find((p) => p.id === selectedProject);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></span>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Portail Client</h1>
          <p className="text-sm text-muted-foreground">Ce que vos clients voient : avancement, factures, messages.</p>
        </div>
        <div className="min-w-[240px]">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger><SelectValue placeholder="Sélectionner un projet…" /></SelectTrigger>
            <SelectContent>
              {(projects ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {current && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">{current.name}</div>
                <div className="text-xs text-muted-foreground">{current.location ?? "—"} · Livraison prévue {current.end_date ?? "—"}</div>
              </div>
              <Badge variant="secondary">{current.status}</Badge>
            </div>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Avancement</span><span>{current.progress}%</span></div>
              <Progress value={current.progress} />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><ImageIcon className="h-4 w-4" /> Progression du projet</CardTitle>
            {canUploadPhotos && (
              <div className="flex items-center gap-2">
                <Input ref={fileRef} type="file" accept="image/*" className="h-9 w-56" />
                <Button size="sm" onClick={upload} disabled={uploading || !selectedProject}>
                  <Upload className="mr-2 h-4 w-4" /> {uploading ? "…" : "Ajouter"}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {(!photos || photos.length === 0) && (
              <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Aucune photo pour l'instant. {canUploadPhotos && "Ajoutez des photos pour permettre au client de suivre l'évolution."}
              </div>
            )}
            {photos && photos.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {photos.map((p) => (
                  <div key={p.id} className="group overflow-hidden rounded-md border border-border">
                    {signed[p.storage_path] ? (
                      <img src={signed[p.storage_path]} alt={p.name} className="h-40 w-full object-cover" />
                    ) : (
                      <div className="h-40 w-full animate-pulse bg-muted" />
                    )}
                    <div className="border-t border-border p-2 text-xs">
                      <div className="truncate font-medium">{p.name}</div>
                      <div className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Receipt className="h-4 w-4" /> Factures</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {((invoices ?? []) as Array<{ id: string; invoice_number: string | null; amount: number; status: string }>).slice(0, 6).map((i) => (
                <div key={i.id} className="flex items-center justify-between text-sm">
                  <span>{i.invoice_number}</span>
                  <span className="text-muted-foreground">${Number(i.amount).toLocaleString()} · {i.status}</span>
                </div>
              ))}
              {(invoices?.length ?? 0) === 0 && <div className="text-sm text-muted-foreground">Aucune facture.</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4" /> Messages</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Les messages du client apparaîtront ici. Utilisez le module Notifications pour communiquer.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
