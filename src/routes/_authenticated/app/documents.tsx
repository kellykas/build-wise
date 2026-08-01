import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Download, Eye, ExternalLink, FileText, Folder, FolderPlus, Trash2, Upload, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { recordAudit } from "@/lib/audit";
import { buildStoragePath, diagnoseUploadError } from "@/lib/upload";


export const Route = createFileRoute("/_authenticated/app/documents")({
  head: () => ({
    meta: [
      { title: "Documents — BuildFlow ERP" },
      { name: "description", content: "Upload, organize, preview and download project documents in BuildFlow ERP." },
      { property: "og:title", content: "Documents — BuildFlow ERP" },
      { property: "og:description", content: "Upload, organize, preview and download project documents in BuildFlow ERP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocumentsPage,
});

type Doc = { id: string; name: string; folder: string | null; mime_type: string | null; size_bytes: number | null; storage_path: string; created_at: string };
type Project = { id: string; name: string };
type PreviewState = { doc: Doc; url: string } | null;

type UploadJob = { name: string; status: "pending" | "uploading" | "done" | "error"; error?: string };

const DEFAULT_FOLDERS = ["Contrats", "Plans", "Rapports", "Factures", "Photos chantier", "Administratif"];

function DocumentsPage() {
  const qc = useQueryClient();
  const { profile, user } = useAuth();
  const [active, setActive] = useState<string>("all");
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFolder, setUploadFolder] = useState<string>(DEFAULT_FOLDERS[0]);
  const [uploadProject, setUploadProject] = useState<string>("general");
  const [uploading, setUploading] = useState(false);
  const [jobs, setJobs] = useState<UploadJob[]>([]);

  const [preview, setPreview] = useState<PreviewState>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: docs } = useQuery({
    queryKey: ["module:documents", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Doc[];
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["documents-projects", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").order("name");
      if (error) throw error;
      return (data ?? []) as Project[];
    },
  });

  const folders = useMemo(() => {
    const set = new Set<string>(DEFAULT_FOLDERS);
    customFolders.forEach((f) => set.add(f));
    (docs ?? []).forEach((d) => { if (d.folder) set.add(d.folder); });
    return Array.from(set);
  }, [docs, customFolders]);

  const filtered = (docs ?? []).filter((d) => active === "all" || (d.folder ?? "Autres") === active);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    (docs ?? []).forEach((d) => { const k = d.folder ?? "Autres"; m.set(k, (m.get(k) ?? 0) + 1); });
    return m;
  }, [docs]);

  const addFolder = () => {
    const n = newFolderName.trim();
    if (!n) return;
    if (folders.includes(n)) { toast.error("Ce dossier existe déjà"); return; }
    setCustomFolders((s) => [...s, n]);
    setActive(n);
    setUploadFolder(n);
    setNewFolderName("");
    setNewFolderOpen(false);
    toast.success(`Dossier "${n}" créé`);
  };

  const upload = async () => {
    const files = Array.from(fileRef.current?.files ?? []);
    if (files.length === 0) return toast.error("Choisissez au moins un fichier");
    if (!profile?.company_id) return toast.error("Espace de travail introuvable");
    const companyId = profile.company_id;
    const projectId = uploadProject === "general" ? null : uploadProject;

    setUploading(true);
    setJobs(files.map((f) => ({ name: f.name, status: "pending" as const })));
    let done = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setJobs((s) => s.map((j, idx) => (idx === i ? { ...j, status: "uploading" } : j)));
      const path = buildStoragePath({ companyId, projectId, folder: uploadFolder, fileName: file.name });

      const up = await supabase.storage.from("documents").upload(path, file, { upsert: false, contentType: file.type });
      if (up.error) {
        const d = diagnoseUploadError(up.error as { message?: string; statusCode?: string }, "storage");
        setJobs((s) => s.map((j, idx) => (idx === i ? { ...j, status: "error", error: `${d.message} ${d.hint}` } : j)));
        failed++;
        continue;
      }

      const ins = await supabase.from("documents").insert({
        company_id: companyId,
        project_id: projectId,
        name: file.name,
        folder: uploadFolder,
        mime_type: file.type,
        size_bytes: file.size,
        storage_path: path,
        uploaded_by: user?.id ?? null,
      } as never);

      if (ins.error) {
        await supabase.storage.from("documents").remove([path]);
        const d = diagnoseUploadError(ins.error, "database");
        setJobs((s) => s.map((j, idx) => (idx === i ? { ...j, status: "error", error: `${d.message} ${d.hint}` } : j)));
        failed++;
        continue;
      }

      await recordAudit({
        action: "document.upload",
        entity_type: "document",
        entity_id: projectId,
        metadata: { name: file.name, folder: uploadFolder, company_id: companyId, project_id: projectId, size: file.size, mime_type: file.type, path, uploaded_at: new Date().toISOString() },
      });
      done++;
      setJobs((s) => s.map((j, idx) => (idx === i ? { ...j, status: "done" } : j)));
      qc.invalidateQueries({ queryKey: ["module:documents"] });
    }

    setUploading(false);
    if (failed === 0) {
      toast.success(`${done} fichier${done > 1 ? "s" : ""} téléversé${done > 1 ? "s" : ""}`);
      setUploadOpen(false);
      setJobs([]);
      if (fileRef.current) fileRef.current.value = "";
    } else {
      toast.error(`${failed} échec${failed > 1 ? "s" : ""} sur ${files.length}. Voir le détail dans la fenêtre.`);
    }
    qc.invalidateQueries({ queryKey: ["module:documents"] });
  };


  const createSignedUrl = async (d: Doc) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(d.storage_path, 60);
    if (error) {
      toast.error(error.message);
      return null;
    }
    return data.signedUrl;
  };

  const download = async (d: Doc) => {
    const url = await createSignedUrl(d);
    if (url) window.open(url, "_blank");
  };

  const openPreview = async (d: Doc) => {
    setPreviewLoading(true);
    const url = await createSignedUrl(d);
    setPreviewLoading(false);
    if (url) setPreview({ doc: d, url });
  };

  const remove = async (d: Doc) => {
    if (!confirm(`Supprimer "${d.name}" ?`)) return;
    await supabase.storage.from("documents").remove([d.storage_path]);
    const { error } = await supabase.from("documents").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    await recordAudit({ action: "document.delete", entity_type: "document", entity_id: d.id, metadata: { name: d.name, folder: d.folder } });
    toast.success("Supprimé");
    qc.invalidateQueries({ queryKey: ["module:documents"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><FileText className="h-5 w-5" /></span>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground">Contrats, plans, rapports, photos et fichiers de projet.</p>
        </div>
        <Button variant="outline" onClick={() => setNewFolderOpen(true)}><FolderPlus className="mr-2 h-4 w-4" /> Nouveau dossier</Button>
        <Button onClick={() => setUploadOpen(true)}><Upload className="mr-2 h-4 w-4" /> Téléverser</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setActive("all")} className={`rounded-full border px-3 py-1 text-xs ${active === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
          Tous ({docs?.length ?? 0})
        </button>
        {folders.map((f) => (
          <button key={f} onClick={() => setActive(f)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${active === f ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
            <Folder className="h-3 w-3" /> {f}
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{counts.get(f) ?? 0}</Badge>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Fichier</th>
                <th className="px-4 py-2">Dossier</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Taille</th>
                <th className="px-4 py-2">Ajouté</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} onClick={() => openPreview(d)} className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">
                    <button type="button" className="text-left hover:text-primary" onClick={(e) => { e.stopPropagation(); openPreview(d); }}>{d.name}</button>
                  </td>
                  <td className="px-4 py-2"><Badge variant="outline">{d.folder ?? "Autres"}</Badge></td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{d.mime_type ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">{d.size_bytes ? `${Math.round(Number(d.size_bytes) / 1024)} KB` : "—"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" title="Preview" onClick={() => openPreview(d)}><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Download" onClick={() => download(d)}><Download className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Delete" onClick={() => remove(d)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">Aucun document dans ce dossier.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau dossier</DialogTitle>
            <DialogDescription>Créez un dossier pour organiser vos documents par catégorie.</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Nom du dossier</Label>
            <Input className="mt-1" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="ex. Photos chantier — Phase 2" onKeyDown={(e) => e.key === "Enter" && addFolder()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>Annuler</Button>
            <Button onClick={addFolder}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Téléverser des documents</DialogTitle>
            <DialogDescription>Sélectionnez un ou plusieurs fichiers ; ils seront archivés dans le dossier choisi.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Projet</Label>
              <Select value={uploadProject} onValueChange={setUploadProject}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Documents généraux</SelectItem>
                  {(projects ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Dossier</Label>
              <Select value={uploadFolder} onValueChange={setUploadFolder}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {folders.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fichiers</Label>
              <Input ref={fileRef} type="file" multiple className="mt-1" onChange={() => setJobs([])} />
              <p className="mt-1 text-xs text-muted-foreground">Vous pouvez sélectionner plusieurs fichiers à la fois.</p>
            </div>
            {jobs.length > 0 && (
              <div className="space-y-2 rounded-md border border-border p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progression</span>
                  <span>{jobs.filter((j) => j.status === "done").length}/{jobs.length}</span>
                </div>
                <Progress value={(jobs.filter((j) => j.status !== "pending" && j.status !== "uploading").length / jobs.length) * 100} />
                <div className="max-h-40 space-y-1 overflow-auto">
                  {jobs.map((j) => (
                    <div key={j.name} className="text-xs">
                      <div className="flex items-center gap-2">
                        {j.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                        {j.status === "error" && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                        {j.status === "uploading" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                        {j.status === "pending" && <span className="h-3.5 w-3.5 rounded-full border border-border" />}
                        <span className="truncate">{j.name}</span>
                      </div>
                      {j.error && <div className="ml-5 text-[11px] text-destructive">{j.error}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Annuler</Button>
            <Button onClick={upload} disabled={uploading}>{uploading ? "Téléversement…" : "Téléverser"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview || previewLoading} onOpenChange={(open) => { if (!open) setPreview(null); }}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>{preview?.doc.name ?? "Préparation de l'aperçu…"}</DialogTitle>
            <DialogDescription>{preview?.doc.mime_type ?? "Document"}</DialogDescription>
          </DialogHeader>
          <div className="min-h-[60vh] overflow-hidden rounded-md border border-border bg-muted/30">
            {previewLoading && <div className="grid h-[60vh] place-items-center text-sm text-muted-foreground">Chargement de l'aperçu…</div>}
            {!previewLoading && preview?.doc.mime_type?.startsWith("image/") && (
              <img src={preview.url} alt={preview.doc.name} className="h-[60vh] w-full object-contain" />
            )}
            {!previewLoading && preview?.doc.mime_type === "application/pdf" && (
              <iframe src={preview.url} title={preview.doc.name} className="h-[60vh] w-full" />
            )}
            {!previewLoading && preview && !preview.doc.mime_type?.startsWith("image/") && preview.doc.mime_type !== "application/pdf" && (
              <div className="grid h-[60vh] place-items-center p-8 text-center">
                <div>
                  <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
                  <div className="mt-3 text-sm font-medium">Aperçu intégré non disponible pour ce type de fichier.</div>
                  <Button className="mt-4" onClick={() => window.open(preview.url, "_blank")}><ExternalLink className="mr-2 h-4 w-4" /> Ouvrir le fichier</Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>Fermer</Button>
            {preview && <Button onClick={() => window.open(preview.url, "_blank")}><Download className="mr-2 h-4 w-4" /> Télécharger</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
