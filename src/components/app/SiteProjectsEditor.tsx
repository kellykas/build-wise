import { useState, useRef } from "react";
import {
  FolderKanban, Plus, Trash2, Save, Upload, ChevronDown, ChevronRight,
  GripVertical, Image, Image as ImageIcon, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useUpsertSiteContent, getContentValue } from "@/hooks/use-site-content";
import { supabase } from "@/integrations/supabase/client";
import { diagnoseUploadError, buildStoragePath } from "@/lib/upload";

/* ------------------------------------------------------------------ */
/* Image Upload Component                                              */
/* ------------------------------------------------------------------ */

export function ImageUpload({
  value,
  onChange,
  companyId,
  folder,
  label,
  bucket = "documents",
}: {
  value: string;
  onChange: (url: string) => void;
  companyId?: string | null;
  folder: string;
  label: string;
  /** Storage bucket the image is uploaded to. Defaults to the private documents bucket. */
  bucket?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;

    setUploading(true);
    try {
      const path = buildStoragePath({
        companyId,
        folder,
        fileName: file.name,
      });

      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });

      if (error) {
        const diag = diagnoseUploadError(error, "storage");
        toast.error(diag.message);
        return;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      if (data?.publicUrl) {
        onChange(data.publicUrl);
        toast.success("Image téléversée");
      }
    } catch (err) {
      toast.error(`Échec du téléversement : ${(err as Error).message}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="mt-1 flex items-center gap-3">
        {value ? (
          <div className="relative">
            <img
              src={value}
              alt=""
              className="h-20 w-20 rounded-lg border border-border object-cover"
            />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border transition-colors hover:border-primary/50"
          >
            {uploading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
        {!value && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="mr-2 h-3.5 w-3.5" />
            {uploading ? "Téléversement..." : "Téléverser une image"}
          </Button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Multi-photo upload for projects                                     */
/* ------------------------------------------------------------------ */
function ProjectPhotosUpload({
  projectId,
  imgs,
  companyId,
  onChange,
}: {
  projectId: string;
  imgs: string[];
  companyId?: string | null;
  onChange: (imgs: string[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length || !companyId) return;

    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const path = buildStoragePath({
        companyId,
        projectId,
        folder: "projects",
        fileName: file.name,
      });
      const { error } = await supabase.storage
        .from("site-images")
        .upload(path, file, { upsert: true });
      if (error) {
        toast.error(diagnoseUploadError(error, "storage").message);
        continue;
      }
      const { data } = supabase.storage.from("site-images").getPublicUrl(path);
      if (data?.publicUrl) newUrls.push(data.publicUrl);
    }
    if (newUrls.length) {
      onChange([...imgs, ...newUrls]);
      toast.success(`${newUrls.length} photo(s) ajoutée(s)`);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div>
      <Label className="text-sm font-medium">Photos supplémentaires</Label>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Ajoutez des photos pour la galerie de la page de détail du projet.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {imgs.map((url, idx) => (
          <div key={idx} className="relative">
            <img src={url} alt="" className="h-20 w-20 rounded-lg border border-border object-cover" />
            <button
              type="button"
              onClick={() => onChange(imgs.filter((_, i) => i !== idx))}
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
        <div
          onClick={() => fileRef.current?.click()}
          className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border transition-colors hover:border-primary/50"
        >
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => fileRef.current?.click()}>
        <Upload className="mr-2 h-3.5 w-3.5" /> Ajouter des photos
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
export interface SiteProject {
  id: string;
  title: string;
  category: string;
  location: string;
  year: string;
  size: string;
  status: string;
  blurb: string;
  description?: string;
  img: string;
  imgs?: string[];
}

export interface FeaturedItem {
  id: string;
  title: string;
  tag: string;
  img?: string;
  imgs?: string[];
}

/* ------------------------------------------------------------------ */
/* Projects Editor — feeds the public /projets page (cms.projects)     */
/* ------------------------------------------------------------------ */

export function ProjectsEditor({
  content,
  upsert,
  companyId,
}: {
  content: Record<string, unknown>;
  upsert: ReturnType<typeof useUpsertSiteContent>;
  companyId?: string | null;
}) {
  const raw = getContentValue(content, "cms", "projects", []) as SiteProject[];
  const [projects, setProjects] = useState<SiteProject[]>(() =>
    raw.length > 0 ? raw : []
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addProject = () => {
    const id = crypto.randomUUID();
    setProjects([...projects, { id, title: "", category: "commercial", location: "", year: "2025", size: "", status: "Completed", blurb: "", img: "" }]);
    setExpandedId(id);
  };

  const updateProject = (id: string, field: keyof SiteProject, value: string | string[]) => {
    setProjects(projects.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const removeProject = (id: string) => {
    setProjects(projects.filter((p) => p.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const save = async () => {
    await upsert.mutateAsync({ section: "cms", key: "projects", value: projects, companyId });
    toast.success("Projets enregistrés !");
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Projets du site public</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ces projets apparaissent sur la page « /projets » de votre site. Cliquez sur
                « Enregistrer les projets » pour publier vos modifications.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a href="/projects" target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-3.5 w-3.5" /> Voir la page Projets
              </a>
            </Button>
            <Button size="sm" onClick={addProject}>
              <Plus className="mr-2 h-3.5 w-3.5" /> Ajouter un projet
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {projects.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Aucun projet pour le moment. Cliquez sur « Ajouter un projet » pour créer le premier
            projet affiché sur votre site.
          </div>
        )}
        {projects.map((p) => (
          <Card key={p.id}>
            <CardHeader
              className="cursor-pointer select-none py-3"
              onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm">{p.title || "Nouveau projet"}</CardTitle>
                  {p.category && <Badge variant="outline" className="text-xs">{p.category}</Badge>}
                  <Badge variant={p.status === "Completed" ? "default" : "secondary"} className="text-xs">
                    {p.status === "Completed" ? "Terminé" : "En cours"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeProject(p.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                  {expandedId === p.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
              </div>
            </CardHeader>
            {expandedId === p.id && (
              <CardContent className="space-y-4 pt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Titre</Label>
                    <Input value={p.title} onChange={(e) => updateProject(p.id, "title", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Catégorie</Label>
                    <Select value={p.category} onValueChange={(v) => updateProject(p.id, "category", v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="residential">Résidentiel</SelectItem>
                        <SelectItem value="industrial">Industriel</SelectItem>
                        <SelectItem value="renovation">Rénovation</SelectItem>
                        <SelectItem value="infrastructure">Infrastructure</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Lieu</Label>
                    <Input value={p.location} onChange={(e) => updateProject(p.id, "location", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Année</Label>
                    <Input value={p.year} onChange={(e) => updateProject(p.id, "year", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Taille</Label>
                    <Input value={p.size} onChange={(e) => updateProject(p.id, "size", e.target.value)} className="mt-1" placeholder="ex. 480 000 m²" />
                  </div>
                  <div>
                    <Label>Statut</Label>
                    <Select value={p.status} onValueChange={(v) => updateProject(p.id, "status", v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Completed">Terminé</SelectItem>
                        <SelectItem value="In progress">En cours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={p.blurb} onChange={(e) => updateProject(p.id, "blurb", e.target.value)} className="mt-1" rows={3} />
                </div>
                <div>
                  <Label>Description détaillée</Label>
                  <Textarea
                    value={p.description || ""}
                    onChange={(e) => updateProject(p.id, "description", e.target.value)}
                    className="mt-1"
                    rows={4}
                    placeholder="Description détaillée du projet pour la page de détail..."
                  />
                </div>
                <ImageUpload
                  value={p.img}
                  onChange={(url) => updateProject(p.id, "img", url)}
                  companyId={companyId}
                  folder="projects"
                  bucket="site-images"
                  label="Image principale"
                />
                {/* Additional photos */}
                <ProjectPhotosUpload
                  projectId={p.id}
                  imgs={p.imgs || []}
                  companyId={companyId}
                  onChange={(imgs) => updateProject(p.id, "imgs", imgs)}
                />
              </CardContent>
            )}
          </Card>
        ))}
        <Button onClick={save} disabled={upsert.isPending} className="gap-2">
          <Save className="h-4 w-4" /> {upsert.isPending ? "Enregistrement..." : "Enregistrer les projets"}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Featured Items Editor — visual editor for cms.featured.items        */
/* ------------------------------------------------------------------ */
export function FeaturedItemsEditor({
  content,
  upsert,
  companyId,
}: {
  content: Record<string, unknown>;
  upsert: ReturnType<typeof useUpsertSiteContent>;
  companyId?: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const raw = getContentValue(content, "featured", "items", []) as FeaturedItem[];
  const [items, setItems] = useState<FeaturedItem[]>(() =>
    raw.length > 0 ? raw : []
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleFeaturedUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length || !companyId) return;

    for (const file of Array.from(files)) {
      const path = buildStoragePath({
        companyId,
        folder: "featured",
        fileName: file.name,
      });

      const { error } = await supabase.storage
        .from("site-images")
        .upload(path, file, { upsert: true });

      if (error) {
        const diag = diagnoseUploadError(error, "storage");
        toast.error(diag.message);
        continue;
      }

      const { data } = supabase.storage.from("site-images").getPublicUrl(path);
      if (data?.publicUrl) {
        setItems((prev) => {
          const updated = [...prev];
          const idx = expandedId ? updated.findIndex((p) => p.id === expandedId) : 0;
          if (idx >= 0) {
            const item = updated[idx];
            const existing = (item.imgs || []);
            updated[idx] = { ...item, imgs: [...existing, data.publicUrl] };
          }
          return updated;
        });
        toast.success("Photo ajoutée");
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const addItem = () => {
    const id = crypto.randomUUID();
    setItems([...items, { id, title: "", tag: "", img: "" }]);
    setExpandedId(id);
  };

  const updateItem = (id: string, field: keyof FeaturedItem, value: string | string[]) => {
    setItems(items.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const removeItem = (id: string) => {
    setItems(items.filter((p) => p.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const save = async () => {
    await upsert.mutateAsync({ section: "featured", key: "items", value: items, companyId });
    toast.success("Projets en vedette enregistrés !");
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Projets en vedette (bannière d'accueil)</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ces projets apparaissent sur la bannière d'accueil (« / »). Vous pouvez ajouter
                plusieurs photos par projet.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={addItem}>
              <Plus className="mr-2 h-3.5 w-3.5" /> Ajouter un projet
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {items.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Aucun projet en vedette. Cliquez sur « Ajouter un projet » pour créer le premier.
          </div>
        )}
        {items.map((p) => (
          <Card key={p.id}>
            <CardHeader
              className="cursor-pointer select-none py-3"
              onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm">{p.title || "Nouveau projet"}</CardTitle>
                  <Badge variant="outline" className="text-xs">{p.tag || "Sans étiquette"}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(p.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                  {expandedId === p.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
              </div>
            </CardHeader>
            {expandedId === p.id && (
              <CardContent className="space-y-4 pt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Titre</Label>
                    <Input value={p.title} onChange={(e) => updateItem(p.id, "title", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Étiquette</Label>
                    <Input value={p.tag} onChange={(e) => updateItem(p.id, "tag", e.target.value)} className="mt-1" placeholder="ex. Nouveau" />
                  </div>
                </div>
                {/* Multiple images upload */}
                <div>
                  <Label className="text-sm font-medium">Photos du projet</Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Ajoutez plusieurs photos. La première sera affichée seule,
                    2-3 photos seront affichées en grille, plus de 3 seront limitées à 3.
                  </p>
                  <div className="mt-2">
                    {(p.imgs && p.imgs.length > 0 ? p.imgs : []).concat(p.img ? [p.img] : []).map((url, idx) => (
                      <div key={idx} className="relative inline-block mr-2">
                        <img
                          src={url}
                          alt=""
                          className="h-16 w-16 rounded-lg border border-border object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newImgs = (p.imgs || []).filter((_, i) => i !== idx);
                            updateItem(p.id, "imgs", newImgs);
                          }}
                          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground"
                        >
                          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                    <div
                      onClick={() => fileRef.current?.click()}
                      className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border transition-colors hover:border-primary/50"
                    >
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFeaturedUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="mr-2 h-3.5 w-3.5" />
                    Ajouter une photo
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
        <Button onClick={save} disabled={upsert.isPending} className="gap-2">
          <Save className="h-4 w-4" /> {upsert.isPending ? "Enregistrement..." : "Enregistrer les projets en vedette"}
        </Button>
      </CardContent>
    </Card>
  );
}
