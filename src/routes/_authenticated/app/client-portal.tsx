import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { buildStoragePath } from "@/lib/upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Building2, Upload, ImageIcon, Receipt, FileText, Download, Trash2, ChevronLeft, ChevronRight, Clock, Calendar, TrendingUp, CheckCircle2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { recordAudit } from "@/lib/audit";
import { buildProgressPhotoPath, sortGallery, type GallerySort } from "@/lib/upload";

export const Route = createFileRoute("/_authenticated/app/client-portal")({
  head: () => ({ meta: [{ title: "Client Portal — BuildFlow Construction" }, { name: "description", content: "View your project progress, invoices, photos and documents." }] }),
  component: ClientPortalPage,
});

type Project = { id: string; name: string; progress: number; status: string; location: string | null; end_date: string | null; start_date: string | null; budget: number | null; description: string | null };
type ProgressPhoto = { id: string; name: string; storage_path: string; created_at: string; uploaded_by: string | null };
type Invoice = { id: string; invoice_number: string | null; amount: number; paid_amount: number | null; status: string; issue_date: string | null; due_date: string | null; description?: string | null };
type ProjectDocument = { id: string; name: string; folder: string; mime_type: string | null; size_bytes: number | null; storage_path: string; created_at: string };

const PHOTO_FOLDER = "Progression client";

function ClientPortalPage() {
  const { t } = useTranslation();
  const { profile, user, isAdmin, hasRole, signOut } = useAuth();
  const qc = useQueryClient();
  const canUploadPhotos = isAdmin || hasRole("project_manager", "director", "client");
  const canDeletePhotos = isAdmin || hasRole("project_manager", "director");
  const [selectedProject, setSelectedProject] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [sort, setSort] = useState<GallerySort>("newest");
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<ProgressPhoto | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [docSigned, setDocSigned] = useState<Record<string, string>>({});

  // Fetch projects — clients only see their assigned projects
  const { data: projects } = useQuery({
    queryKey: ["portal-projects", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      if (hasRole("client") && !isAdmin) {
        const { data: client } = await supabase.from("clients").select("id").eq("user_id", profile!.id).maybeSingle();
        if (client) {
          const { data } = await supabase.from("projects").select("id, name, progress, status, location, end_date, start_date, budget, description").eq("client_id", client.id).order("created_at", { ascending: false });
          return (data ?? []) as Project[];
        }
        const { data: mp } = await supabase.from("project_members").select("project_id").eq("user_id", profile!.id);
        if (mp && mp.length > 0) {
          const { data } = await supabase.from("projects").select("id, name, progress, status, location, end_date, start_date, budget, description").in("id", mp.map((m) => m.project_id));
          return (data ?? []) as Project[];
        }
        return [];
      }
      const { data, error } = await supabase.from("projects").select("id, name, progress, status, location, end_date, start_date, budget, description").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Project[];
    },
  });

  useEffect(() => { if (projects && projects.length > 0 && !selectedProject) setSelectedProject(projects[0].id); }, [projects, selectedProject]);
  const current = useMemo(() => projects?.find((p) => p.id === selectedProject), [projects, selectedProject]);

  // Invoices
  const { data: invoices } = useQuery({ queryKey: ["portal-invoices", selectedProject], enabled: !!selectedProject, queryFn: async () => { const { data, error } = await supabase.from("invoices").select("*").eq("project_id", selectedProject).order("issue_date", { ascending: false }); if (error) throw error; return (data ?? []) as Invoice[]; } });

  // Tasks
  const { data: tasks } = useQuery({ queryKey: ["portal-tasks", selectedProject], enabled: !!selectedProject, queryFn: async () => { const { data, error } = await supabase.from("tasks").select("id, name, status, priority, due_date, progress").eq("project_id", selectedProject).order("due_date", { ascending: true }); if (error) throw error; return data ?? []; } });

  // Documents
  const { data: documents } = useQuery({ queryKey: ["portal-documents", selectedProject], enabled: !!selectedProject, queryFn: async () => { const { data, error } = await supabase.from("documents").select("id, name, folder, mime_type, size_bytes, storage_path, created_at").eq("project_id", selectedProject).order("created_at", { ascending: false }); if (error) throw error; return (data ?? []) as ProjectDocument[]; } });

  // Photos
  const { data: photos } = useQuery({ queryKey: ["portal-photos", selectedProject], enabled: !!selectedProject, queryFn: async () => { const { data, error } = await supabase.from("documents").select("id, name, storage_path, created_at, uploaded_by").eq("project_id", selectedProject).eq("folder", PHOTO_FOLDER).order("created_at", { ascending: false }); if (error) throw error; return (data ?? []) as ProgressPhoto[]; } });

  // Build public URLs for photos (stored in the public site-images bucket).
  useEffect(() => { if (!photos?.length) { setSigned({}); return; } const map: Record<string, string> = {}; for (const p of photos) { map[p.storage_path] = supabase.storage.from("site-images").getPublicUrl(p.storage_path).data?.publicUrl ?? ""; } setSigned(map); }, [photos]);

  // Sign document URLs
  useEffect(() => { (async () => { if (!documents?.length) { setDocSigned({}); return; } const paths = documents.map((d) => d.storage_path); const { data } = await supabase.storage.from("documents").createSignedUrls(paths, 3600); const map: Record<string, string> = {}; (data ?? []).forEach((s, i) => { if (s.signedUrl) map[paths[i]] = s.signedUrl; }); setDocSigned(map); })(); }, [documents]);

  // Stats
  const invoiceStats = useMemo(() => { if (!invoices) return { total: 0, paid: 0, overdue: 0, totalAmount: 0, paidAmount: 0 }; return { total: invoices.length, paid: invoices.filter((i) => i.status === "paid").length, overdue: invoices.filter((i) => i.status === "overdue").length, totalAmount: invoices.reduce((s, i) => s + Number(i.amount || 0), 0), paidAmount: invoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0) }; }, [invoices]);
  const taskStats = useMemo(() => { if (!tasks) return { total: 0, completed: 0, inProgress: 0, overdue: 0 }; return { total: tasks.length, completed: tasks.filter((t) => t.status === "completed").length, inProgress: tasks.filter((t) => t.status === "in_progress").length, overdue: tasks.filter((t) => t.status === "overdue").length }; }, [tasks]);
  const sortedPhotos = photos ? sortGallery(photos, sort) : [];
  const lightboxIndex = lightbox ? sortedPhotos.findIndex((p) => p.id === lightbox.id) : -1;

  // Upload
  const uploadPhotos = async () => {
    const files = Array.from(fileRef.current?.files ?? []);
    if (!files.length) return toast.error(t("d.portal.choose_photo"));
    if (!selectedProject || !profile?.company_id) return toast.error(t("d.portal.select_project_first"));
    setUploading(true);
    let ok = 0;
    for (const file of files) {
      if (!file.type.startsWith("image/")) { toast.error(`${file.name}: only images`); continue; }
      const path = buildStoragePath({ companyId: profile.company_id, projectId: selectedProject, folder: "client-portal", fileName: file.name });
      const up = await supabase.storage.from("site-images").upload(path, file, { contentType: file.type });
      if (up.error) { toast.error(up.error.message); continue; }
      const ins = await supabase.from("documents").insert({ company_id: profile.company_id, project_id: selectedProject, name: caption.trim() || file.name, folder: PHOTO_FOLDER, mime_type: file.type, size_bytes: file.size, storage_path: path, uploaded_by: user?.id ?? null } as never);
      if (ins.error) { await supabase.storage.from("site-images").remove([path]); toast.error(ins.error.message); continue; }
      await recordAudit({ action: "portal.photo.upload", entity_type: "project", entity_id: selectedProject, metadata: { name: file.name, company_id: profile.company_id, project_id: selectedProject } });
      ok++;
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (ok > 0) { setCaption(""); toast.success(`${ok} photo${ok > 1 ? "s" : ""} uploaded`); }
    await qc.invalidateQueries({ queryKey: ["portal-photos", selectedProject] });
  };

  const deletePhoto = async (photo: ProgressPhoto) => {
    if (!confirm(`Delete "${photo.name}"?`)) return;
    const { error: se } = await supabase.storage.from("site-images").remove([photo.storage_path]);
    if (se) return toast.error(se.message);
    const { error: de } = await supabase.from("documents").delete().eq("id", photo.id);
    if (de) return toast.error(de.message);
    await recordAudit({ action: "portal.photo.delete", entity_type: "project", entity_id: selectedProject, metadata: { name: photo.name } });
    toast.success(t("d.portal.photo_deleted"));
    if (lightbox?.id === photo.id) setLightbox(null);
    await qc.invalidateQueries({ queryKey: ["portal-photos", selectedProject] });
  };

  if (!projects?.length) return <div className="flex min-h-[60vh] items-center justify-center"><div className="text-center"><Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" /><h2 className="mt-4 text-lg font-semibold">{t("d.portal.no_projects")}</h2><p className="mt-2 text-sm text-muted-foreground">{t("d.portal.no_projects_desc")}</p></div></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></span>
          <div><h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t("d.portal.title")}</h1><p className="text-sm text-muted-foreground">{t("d.portal.subtitle")}</p></div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder={t("d.portal.select_project")} /></SelectTrigger>
            <SelectContent>{(projects ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Project summary */}
      {current && (
        <Card><CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-semibold">{current.name}</div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {current.location && <span>📍 {current.location}</span>}
                {current.start_date && <span>· {t("d.portal.started")} {new Date(current.start_date).toLocaleDateString()}</span>}
                {current.end_date && <span>· {t("d.portal.due")} {new Date(current.end_date).toLocaleDateString()}</span>}
              </div>
              {current.description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{current.description}</p>}
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={current.status === "completed" ? "default" : "secondary"}>{current.status.replace(/_/g, " ")}</Badge>
              {current.budget && current.budget > 0 && <Badge variant="outline">💰 ${Number(current.budget).toLocaleString()}</Badge>}
            </div>
          </div>
          <div className="mt-3"><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{t("d.portal.progress")}</span><span>{current.progress}%</span></div><Progress value={current.progress} className="h-3" /></div>
        </CardContent></Card>
      )}

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><TrendingUp className="h-5 w-5" /></div><div><div className="text-2xl font-bold">{current?.progress ?? 0}%</div><div className="text-xs text-muted-foreground">{t("d.portal.complete")}</div></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-green-500/10 text-green-600"><CheckCircle2 className="h-5 w-5" /></div><div><div className="text-2xl font-bold">{taskStats.completed}/{taskStats.total}</div><div className="text-xs text-muted-foreground">{t("d.portal.tasks_done")}</div></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500/10 text-blue-600"><Receipt className="h-5 w-5" /></div><div><div className="text-2xl font-bold">${invoiceStats.paidAmount.toLocaleString()}</div><div className="text-xs text-muted-foreground">Paid / ${invoiceStats.totalAmount.toLocaleString()}</div></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-orange-500/10 text-orange-600"><ImageIcon className="h-5 w-5" /></div><div><div className="text-2xl font-bold">{photos?.length ?? 0}</div><div className="text-xs text-muted-foreground">{t("d.portal.progress_photos")}</div></div></div></CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">{t("d.portal.overview")}</TabsTrigger>
          <TabsTrigger value="invoices">{t("d.portal.invoices")} ({invoices?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="photos">{t("d.portal.photos")} ({photos?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="documents">{t("d.portal.documents")} ({documents?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="tasks">{t("d.portal.tasks")} ({tasks?.length ?? 0})</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card><CardHeader><CardTitle className="text-base">{t("d.portal.task_progress")}</CardTitle></CardHeader><CardContent>
              {tasks?.length ? <div className="space-y-3">{tasks.slice(0, 5).map((tk) => <div key={tk.id} className="flex items-center justify-between rounded-md border border-border p-3"><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{tk.name}</div><div className="text-xs text-muted-foreground">{t("d.portal.due_label")} {tk.due_date ? new Date(tk.due_date).toLocaleDateString() : "—"}</div></div><Badge variant={tk.status === "completed" ? "default" : tk.status === "overdue" ? "destructive" : "secondary"} className="ml-3 shrink-0">{tk.status.replace(/_/g, " ")}</Badge></div>)}{tasks.length > 5 && <Button variant="ghost" size="sm" className="w-full" onClick={() => setActiveTab("tasks")}>{t("d.portal.view_all")}</Button>}</div> : <p className="text-sm text-muted-foreground">{t("d.portal.no_tasks")}</p>}
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">{t("d.portal.recent_invoices")}</CardTitle></CardHeader><CardContent>
              {invoices?.length ? <div className="space-y-3">{invoices.slice(0, 5).map((inv) => <div key={inv.id} className="flex items-center justify-between rounded-md border border-border p-3"><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{inv.invoice_number ?? "Draft"}</div><div className="text-xs text-muted-foreground">{inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : "—"}</div></div><div className="ml-3 text-right shrink-0"><div className="text-sm font-medium">${Number(inv.amount).toLocaleString()}</div><Badge variant={inv.status === "paid" ? "default" : inv.status === "overdue" ? "destructive" : "secondary"} className="text-[10px]">{inv.status}</Badge></div></div>)}{invoices.length > 5 && <Button variant="ghost" size="sm" className="w-full" onClick={() => setActiveTab("invoices")}>View all →</Button>}</div> : <p className="text-sm text-muted-foreground">{t("d.portal.no_invoices")}</p>}
            </CardContent></Card>
          </div>
          {sortedPhotos.length > 0 && <Card><CardHeader><CardTitle className="text-base">{t("d.portal.recent_photos")}</CardTitle></CardHeader><CardContent><div className="grid gap-3 grid-cols-2 sm:grid-cols-4">{sortedPhotos.slice(0, 4).map((p) => <button key={p.id} type="button" onClick={() => setLightbox(p)} className="group overflow-hidden rounded-md border border-border hover:border-primary">{signed[p.storage_path] ? <img src={signed[p.storage_path]} alt={p.name} loading="lazy" className="h-24 w-full object-cover transition group-hover:scale-105" /> : <div className="h-24 w-full animate-pulse bg-muted" />}<div className="p-2"><div className="truncate text-xs font-medium">{p.name}</div></div></button>)}</div>{sortedPhotos.length > 4 && <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => setActiveTab("photos")}>View all →</Button>}</CardContent></Card>}
        </TabsContent>

        {/* Invoices */}
        <TabsContent value="invoices"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Receipt className="h-4 w-4" /> {t("d.portal.invoice_details")}</CardTitle></CardHeader><CardContent>
          {invoices?.length ? <><div className="grid gap-3 sm:grid-cols-3 mb-4"><div className="rounded-md border border-border p-3 text-center"><div className="text-2xl font-bold text-green-600">${invoiceStats.paidAmount.toLocaleString()}</div><div className="text-xs text-muted-foreground">{t("d.portal.paid")}</div></div><div className="rounded-md border border-border p-3 text-center"><div className="text-2xl font-bold text-blue-600">${(invoiceStats.totalAmount - invoiceStats.paidAmount).toLocaleString()}</div><div className="text-xs text-muted-foreground">{t("d.portal.outstanding")}</div></div><div className="rounded-md border border-border p-3 text-center"><div className="text-2xl font-bold text-destructive">{invoiceStats.overdue}</div><div className="text-xs text-muted-foreground">{t("d.portal.overdue")}</div></div></div><Separator className="mb-4" /><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-border text-left text-xs uppercase text-muted-foreground"><tr><th className="pb-2 pr-4">{t("d.portal.invoice_number")}</th><th className="pb-2 pr-4">{t("d.portal.date")}</th><th className="pb-2 pr-4">Due</th><th className="pb-2 pr-4 text-right">{t("d.portal.amount")}</th><th className="pb-2 pr-4 text-right">{t("d.portal.paid")}</th><th className="pb-2">{t("d.portal.status")}</th></tr></thead><tbody>{invoices.map((inv) => <tr key={inv.id} className="border-b border-border last:border-0"><td className="py-3 pr-4 font-medium">{inv.invoice_number ?? "Draft"}</td><td className="py-3 pr-4 text-muted-foreground">{inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : "—"}</td><td className="py-3 pr-4 text-muted-foreground">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}</td><td className="py-3 pr-4 text-right font-medium">${Number(inv.amount).toLocaleString()}</td><td className="py-3 pr-4 text-right text-muted-foreground">${Number(inv.paid_amount || 0).toLocaleString()}</td><td className="py-3"><Badge variant={inv.status === "paid" ? "default" : inv.status === "overdue" ? "destructive" : "secondary"}>{inv.status}</Badge></td></tr>)}</tbody></table></div></> : <div className="py-8 text-center text-sm text-muted-foreground"><Receipt className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />{t("d.portal.no_invoices_project")}</div>}
        </CardContent></Card></TabsContent>

        {/* Photos */}
        <TabsContent value="photos"><Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="flex items-center gap-2 text-base"><ImageIcon className="h-4 w-4" /> {t("d.portal.progress_gallery")} ({photos?.length ?? 0})</CardTitle><Select value={sort} onValueChange={(v) => setSort(v as GallerySort)}><SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">{t("d.portal.newest_first")}</SelectItem><SelectItem value="oldest">{t("d.portal.oldest_first")}</SelectItem><SelectItem value="name">{t("d.portal.caption_az")}</SelectItem></SelectContent></Select></div>
          {canUploadPhotos && <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/30 p-2"><Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder={t("d.portal.caption")} className="h-9 w-48 sm:w-64" /><Input ref={fileRef} type="file" accept="image/*" multiple className="h-9 w-48 sm:w-64" /><Button size="sm" onClick={uploadPhotos} disabled={uploading}><Upload className="mr-2 h-4 w-4" />{uploading ? t("d.portal.uploading") : t("d.portal.add_photos")}</Button></div>}
        </CardHeader><CardContent>
          {sortedPhotos.length === 0 ? <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{t("d.portal.no_photos")}</div> : <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{sortedPhotos.map((p) => <div key={p.id} className="group relative overflow-hidden rounded-md border border-border transition hover:border-primary"><button type="button" onClick={() => setLightbox(p)} className="block w-full">{signed[p.storage_path] ? <img src={signed[p.storage_path]} alt={p.name} loading="lazy" className="h-36 w-full object-cover sm:h-40" /> : <div className="h-36 w-full animate-pulse bg-muted sm:h-40" />}</button><div className="border-t border-border p-2"><div className="truncate text-xs font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</div></div>{canDeletePhotos && <button className="absolute top-1.5 right-1.5 hidden rounded bg-destructive/90 p-1 text-destructive-foreground opacity-0 transition group-hover:block group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); deletePhoto(p); }}><Trash2 className="h-3.5 w-3.5" /></button>}</div>)}</div>}
        </CardContent></Card></TabsContent>

        {/* Documents */}
        <TabsContent value="documents"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> {t("d.portal.project_documents")}</CardTitle></CardHeader><CardContent>
          {documents?.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-border text-left text-xs uppercase text-muted-foreground"><tr><th className="pb-2 pr-4">{t("d.portal.name")}</th><th className="pb-2 pr-4">{t("d.portal.folder")}</th><th className="pb-2 pr-4">{t("d.portal.size")}</th><th className="pb-2 pr-4">Date</th><th className="pb-2">Action</th></tr></thead><tbody>{documents.map((doc) => <tr key={doc.id} className="border-b border-border last:border-0"><td className="py-3 pr-4 font-medium">{doc.name}</td><td className="py-3 pr-4 text-muted-foreground">{doc.folder}</td><td className="py-3 pr-4 text-muted-foreground text-xs">{doc.size_bytes ? `${(doc.size_bytes / 1024).toFixed(1)} KB` : "—"}</td><td className="py-3 pr-4 text-muted-foreground text-xs">{new Date(doc.created_at).toLocaleDateString()}</td><td className="py-3">{docSigned[doc.storage_path] && <a href={docSigned[doc.storage_path]} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="sm" className="h-7 gap-1 text-xs"><Download className="h-3 w-3" />{t("d.portal.download")}</Button></a>}</td></tr>)}</tbody></table></div> : <div className="py-8 text-center text-sm text-muted-foreground"><FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />{t("d.portal.no_documents")}</div>}
        </CardContent></Card></TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 className="h-4 w-4" /> {t("d.portal.project_tasks")}</CardTitle></CardHeader><CardContent>
          {tasks?.length ? <div className="space-y-3">{tasks.map((tk) => <div key={tk.id} className="flex items-center justify-between rounded-md border border-border p-4"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-sm font-medium">{tk.name}</span><Badge variant={tk.priority === "urgent" ? "destructive" : tk.priority === "high" ? "default" : "secondary"} className="text-[10px]">{tk.priority}</Badge></div><div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">{tk.due_date && <span>📅 {t("d.portal.due_label")} {new Date(tk.due_date).toLocaleDateString()}</span>}{tk.progress != null && <span>📊 {tk.progress}%</span>}</div></div><Badge variant={tk.status === "completed" ? "default" : tk.status === "overdue" ? "destructive" : "secondary"}>{tk.status.replace(/_/g, " ")}</Badge></div>)}</div> : <div className="py-8 text-center text-sm text-muted-foreground"><CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />{t("d.portal.no_tasks_project")}</div>}
        </CardContent></Card></TabsContent>
      </Tabs>

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={(o) => { if (!o) setLightbox(null); }}>
        <DialogContent className="max-w-4xl p-0">
          <DialogHeader className="p-4 pb-0"><DialogTitle>{lightbox?.name}</DialogTitle><DialogDescription>{lightbox && new Date(lightbox.created_at).toLocaleString()}{sortedPhotos.length > 1 && ` · ${lightboxIndex + 1} of ${sortedPhotos.length}`}</DialogDescription></DialogHeader>
          <div className="relative">
            {lightbox && sortedPhotos.length > 1 && <><button className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/80 p-2 backdrop-blur hover:bg-background" onClick={() => setLightbox(sortedPhotos[lightboxIndex > 0 ? lightboxIndex - 1 : sortedPhotos.length - 1])}><ChevronLeft className="h-5 w-5" /></button><button className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/80 p-2 backdrop-blur hover:bg-background" onClick={() => setLightbox(sortedPhotos[lightboxIndex < sortedPhotos.length - 1 ? lightboxIndex + 1 : 0])}><ChevronRight className="h-5 w-5" /></button></>}
            {lightbox && signed[lightbox.storage_path] && <img src={signed[lightbox.storage_path]} alt={lightbox.name} className="max-h-[70vh] w-full object-contain" />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
