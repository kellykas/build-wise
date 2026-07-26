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
import { FileText, FolderPlus, Upload, Trash2, Folder, Download } from "lucide-react";
import { toast } from "sonner";
import { recordAudit } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/app/documents")({
  component: DocumentsPage,
});

type Doc = { id: string; name: string; folder: string | null; mime_type: string | null; size_bytes: number | null; storage_path: string; created_at: string };

const DEFAULT_FOLDERS = ["Contrats", "Plans", "Rapports", "Factures", "Photos chantier", "Administratif"];

function DocumentsPage() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const [active, setActive] = useState<string>("all");
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFolder, setUploadFolder] = useState<string>(DEFAULT_FOLDERS[0]);
  const [uploading, setUploading] = useState(false);
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
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.error("Choisissez un fichier");
    if (!profile?.company_id) return toast.error("Espace de travail introuvable");
    setUploading(true);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${profile.company_id}/${uploadFolder}/${Date.now()}-${safe}`;
    const up = await supabase.storage.from("documents").upload(path, file, { upsert: false, contentType: file.type });
    if (up.error) { setUploading(false); return toast.error(up.error.message); }
    const ins = await supabase.from("documents").insert({
      company_id: profile.company_id,
      name: file.name,
      folder: uploadFolder,
      mime_type: file.type,
      size_bytes: file.size,
      storage_path: path,
    } as never);
    setUploading(false);
    if (ins.error) return toast.error(ins.error.message);
    await recordAudit({ action: "document.upload", entity_type: "document", metadata: { name: file.name, folder: uploadFolder, size: file.size, mime_type: file.type, path } });
    toast.success("Fichier téléversé");
    setUploadOpen(false);
    if (fileRef.current) fileRef.current.value = "";
    qc.invalidateQueries({ queryKey: ["module:documents"] });
  };

  const download = async (d: Doc) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(d.storage_path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
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
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{d.name}</td>
                  <td className="px-4 py-2"><Badge variant="outline">{d.folder ?? "Autres"}</Badge></td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{d.mime_type ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">{d.size_bytes ? `${Math.round(Number(d.size_bytes) / 1024)} KB` : "—"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => download(d)}><Download className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(d)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
            <DialogTitle>Téléverser un document</DialogTitle>
            <DialogDescription>Le fichier sera archivé dans le dossier sélectionné.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
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
              <Label>Fichier</Label>
              <Input ref={fileRef} type="file" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Annuler</Button>
            <Button onClick={upload} disabled={uploading}>{uploading ? "Téléversement…" : "Téléverser"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
