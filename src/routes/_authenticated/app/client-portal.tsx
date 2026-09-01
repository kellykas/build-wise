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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Upload, ImageIcon, Receipt, MessageSquare, Trash2, ChevronLeft, ChevronRight, Clock, Calendar } from "lucide-react";
import { toast } from "sonner";
import { recordAudit } from "@/lib/audit";
import { buildProgressPhotoPath, diagnoseUploadError, sortGallery, type GallerySort } from "@/lib/upload";

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

type Project = { id: string; name: string; progress: number; status: string; location: string | null; end_date: string | null; start_date: string | null };
type ProgressPhoto = { id: string; name: string; storage_path: string; created_at: string; uploaded_by: string | null };

const FOLDER = "Progression client";

function ClientPortalPage() {
  const { profile, user, isAdmin, hasRole } = useAuth();
  const qc = useQueryClient();
  const canUploadPhotos = isAdmin || hasRole("project_manager", "director", "client");
  const canDeletePhotos = isAdmin || hasRole("project_manager", "director");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [sort, setSort] = useState<GallerySort>("newest");
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<ProgressPhoto | null>(null);
  const [viewMode, setViewMode] = useState<"gallery" | "timeline">("gallery");

  const { data: projects } = useQuery({
    queryKey: ["portal-projects", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name, progress, status, location, end_date, start_date").order("created_at", { ascending: false });
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
        .select("id, name, storage_path, created_at, uploaded_by")
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
    const files = Array.from(fileRef.current?.files ?? []);
    if (files.length === 0) return toast.error("Choose at least one photo");
    if (!selectedProject) return toast.error("Select a project first");
    if (!profile?.company_id) return toast.error("Workspace not found");
    const companyId = profile.company_id;
    setUploading(true);
    let ok = 0;

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name}: only images are accepted`);
        continue;
      }
      const path = buildProgressPhotoPath({ companyId, projectId: selectedProject, fileName: file.name });
      const up = await supabase.storage.from("documents").upload(path, file, { contentType: file.type });
      if (up.error) {
        const d = diagnoseUploadError(up.error as { message?: string; statusCode?: string }, "storage");
        toast.error(d.message, { description: d.hint, duration: 8000 });
        continue;
      }
      const ins = await supabase.from("documents").insert({
        company_id: companyId,
        project_id: selectedProject,
        name: caption.trim() ? `${caption.trim()}${files.length > 1 ? ` — ${file.name}` : ""}` : file.name,
        folder: FOLDER,
        mime_type: file.type,
        size_bytes: file.size,
        storage_path: path,
        uploaded_by: user?.id ?? null,
      } as never);
      if (ins.error) {
        await supabase.storage.from("documents").remove([path]);
        const d = diagnoseUploadError(ins.error, "database");
        toast.error(d.message, { description: d.hint, duration: 8000 });
        continue;
      }
      await recordAudit({
        action: "portal.photo.upload",
        entity_type: "project",
        entity_id: selectedProject,
        metadata: { name: file.name, caption: caption.trim() || null, company_id: companyId, project_id: selectedProject, size: file.size, mime_type: file.type, path, uploaded_at: new Date().toISOString() },
      });
      ok++;
    }

    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (ok > 0) {
      setCaption("");
      toast.success(`${ok} photo${ok > 1 ? "s" : ""} added`);
    }
    await qc.invalidateQueries({ queryKey: ["portal-photos", selectedProject] });
    qc.invalidateQueries({ queryKey: ["module:documents"] });
  };

  const deletePhoto = async (photo: ProgressPhoto) => {
    if (!confirm(`Delete "${photo.name}"?`)) return;
    const { error: storageErr } = await supabase.storage.from("documents").remove([photo.storage_path]);
    if (storageErr) return toast.error(storageErr.message);
    const { error: dbErr } = await supabase.from("documents").delete().eq("id", photo.id);
    if (dbErr) return toast.error(dbErr.message);
    await recordAudit({
      action: "portal.photo.delete",
      entity_type: "project",
      entity_id: selectedProject,
      metadata: { name: photo.name, storage_path: photo.storage_path },
    });
    toast.success("Photo deleted");
    if (lightbox?.id === photo.id) setLightbox(null);
    await qc.invalidateQueries({ queryKey: ["portal-photos", selectedProject] });
  };

  const sortedPhotos = photos ? sortGallery(photos, sort) : [];
  const lightboxIndex = lightbox ? sortedPhotos.findIndex((p) => p.id === lightbox.id) : -1;
  const current = projects?.find((p) => p.id === selectedProject);

  // Group photos by date for timeline view
  const timelineGroups = sortedPhotos.reduce<Record<string, ProgressPhoto[]>>((acc, photo) => {
    const date = new Date(photo.created_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
    (acc[date] ??= []).push(photo);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></span>
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Client Portal</h1>
            <p className="text-sm text-muted-foreground">Project progress, galleries, invoices & communication.</p>
          </div>
        </div>
        <div className="min-w-0 w-full sm:w-64">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger><SelectValue placeholder="Select a project…" /></SelectTrigger>
            <SelectContent>
              {(projects ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Project summary */}
      {current && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-lg font-semibold">{current.name}</div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{current.location ?? "—"}</span>
                  {current.start_date && <span>· Started {new Date(current.start_date).toLocaleDateString()}</span>}
                  {current.end_date && <span>· Due {new Date(current.end_date).toLocaleDateString()}</span>}
                </div>
              </div>
              <Badge variant="secondary">{current.status}</Badge>
            </div>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Progress</span><span>{current.progress}%</span></div>
              <Progress value={current.progress} />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Gallery */}
        <Card className="lg:col-span-2">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base"><ImageIcon className="h-4 w-4" /> Progress Gallery ({photos?.length ?? 0})</CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex rounded-md border border-border">
                  <button
                    className={`px-2.5 py-1 text-xs ${viewMode === "gallery" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                    onClick={() => setViewMode("gallery")}
                  >Grid</button>
                  <button
                    className={`px-2.5 py-1 text-xs ${viewMode === "timeline" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                    onClick={() => setViewMode("timeline")}
                  >Timeline</button>
                </div>
                <Select value={sort} onValueChange={(v) => setSort(v as GallerySort)}>
                  <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                    <SelectItem value="name">Caption (A→Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {canUploadPhotos && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/30 p-2">
                <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption (e.g. Slab pour R+1)" className="h-9 w-48 sm:w-64" />
                <Input ref={fileRef} type="file" accept="image/*" multiple className="h-9 w-48 sm:w-64" />
                <Button size="sm" onClick={upload} disabled={uploading || !selectedProject}>
                  <Upload className="mr-2 h-4 w-4" /> {uploading ? "Uploading…" : "Add photos"}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {(!photos || photos.length === 0) && (
              <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No photos yet. {canUploadPhotos && "Upload photos to help clients track progress."}
              </div>
            )}

            {/* Gallery Grid View */}
            {viewMode === "gallery" && photos && photos.length > 0 && (
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
                {sortedPhotos.map((p) => (
                  <div key={p.id} className="group relative overflow-hidden rounded-md border border-border text-left transition hover:border-primary">
                    <button type="button" onClick={() => setLightbox(p)} className="block w-full">
                      {signed[p.storage_path] ? (
                        <img src={signed[p.storage_path]} alt={p.name} loading="lazy" className="h-36 w-full object-cover sm:h-40" />
                      ) : (
                        <div className="h-36 w-full animate-pulse bg-muted sm:h-40" />
                      )}
                    </button>
                    <div className="border-t border-border p-2">
                      <div className="truncate text-xs font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</div>
                    </div>
                    {canDeletePhotos && (
                      <button
                        className="absolute top-1.5 right-1.5 hidden rounded bg-destructive/90 p-1 text-destructive-foreground opacity-0 transition group-hover:block group-hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); deletePhoto(p); }}
                      ><Trash2 className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Timeline View */}
            {viewMode === "timeline" && photos && photos.length > 0 && (
              <div className="space-y-6">
                {Object.entries(timelineGroups).map(([date, items]) => (
                  <div key={date}>
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                      <Calendar className="h-4 w-4 text-primary" />
                      {date}
                      <Badge variant="secondary" className="text-[10px]">{items.length} photo{items.length > 1 ? "s" : ""}</Badge>
                    </div>
                    <div className="ml-2 border-l-2 border-primary/20 pl-4 space-y-3">
                      {items.map((p) => (
                        <div key={p.id} className="group relative flex gap-3">
                          <div className="absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
                          <button type="button" onClick={() => setLightbox(p)} className="shrink-0 overflow-hidden rounded-md border border-border hover:border-primary">
                            {signed[p.storage_path] ? (
                              <img src={signed[p.storage_path]} alt={p.name} loading="lazy" className="h-20 w-20 object-cover" />
                            ) : (
                              <div className="h-20 w-20 animate-pulse bg-muted" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{p.name}</div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(p.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                          {canDeletePhotos && (
                            <button
                              className="hidden rounded p-1 text-destructive opacity-0 transition group-hover:block group-hover:opacity-100"
                              onClick={() => deletePhoto(p)}
                            ><Trash2 className="h-3.5 w-3.5" /></button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Receipt className="h-4 w-4" /> Invoices</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {((invoices ?? []) as Array<{ id: string; invoice_number: string | null; amount: number; status: string }>).slice(0, 6).map((i) => (
                <div key={i.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{i.invoice_number}</span>
                  <span className="shrink-0 text-muted-foreground">${Number(i.amount).toLocaleString()} · {i.status}</span>
                </div>
              ))}
              {(invoices?.length ?? 0) === 0 && <div className="text-sm text-muted-foreground">No invoices.</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4" /> Messages</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Client messages appear here. Use the Notifications module to communicate.
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={(o) => { if (!o) setLightbox(null); }}>
        <DialogContent className="max-w-4xl p-0">
          <DialogHeader className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle>{lightbox?.name}</DialogTitle>
              {canDeletePhotos && lightbox && (
                <Button variant="destructive" size="sm" onClick={() => deletePhoto(lightbox)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              )}
            </div>
            <DialogDescription>
              {lightbox && new Date(lightbox.created_at).toLocaleString()}
              {sortedPhotos.length > 1 && ` · ${lightboxIndex + 1} of ${sortedPhotos.length}`}
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            {lightbox && sortedPhotos.length > 1 && (
              <>
                <button
                  className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/80 p-2 backdrop-blur hover:bg-background"
                  onClick={() => {
                    const prev = lightboxIndex > 0 ? lightboxIndex - 1 : sortedPhotos.length - 1;
                    setLightbox(sortedPhotos[prev]);
                  }}
                ><ChevronLeft className="h-5 w-5" /></button>
                <button
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/80 p-2 backdrop-blur hover:bg-background"
                  onClick={() => {
                    const next = lightboxIndex < sortedPhotos.length - 1 ? lightboxIndex + 1 : 0;
                    setLightbox(sortedPhotos[next]);
                  }}
                ><ChevronRight className="h-5 w-5" /></button>
              </>
            )}
            {lightbox && signed[lightbox.storage_path] && (
              <img src={signed[lightbox.storage_path]} alt={lightbox.name} className="max-h-[70vh] w-full object-contain" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
