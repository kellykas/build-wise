import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Users, FolderKanban, Wrench, LayoutTemplate, Milestone,
  Plus, Trash2, Save, Upload, X, ChevronDown, ChevronRight,
  GripVertical, Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  useSiteContent,
  useUpsertSiteContent,
  getContentValue,
} from "@/hooks/use-site-content";
import { ProjectsEditor } from "@/components/app/SiteProjectsEditor";
import { supabase } from "@/integrations/supabase/client";
import { diagnoseUploadError, buildStoragePath, safeFileName } from "@/lib/upload";

export const Route = createFileRoute("/_authenticated/app/cms")({
  component: CMSPage,
});

/* ------------------------------------------------------------------ */
/* Image Upload Component                                              */
/* ------------------------------------------------------------------ */

function ImageUpload({
  value,
  onChange,
  companyId,
  folder,
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  companyId?: string | null;
  folder: string;
  label: string;
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
        .from("documents")
        .upload(path, file, { upsert: true });

      if (error) {
        const diag = diagnoseUploadError(error, "storage");
        toast.error(diag.message);
        return;
      }

      const { data } = supabase.storage.from("documents").getPublicUrl(path);
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
              className="h-20 w-20 rounded-lg object-cover border border-border"
            />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors"
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
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Leadership {
  id: string;
  name: string;
  role: string;
  initials: string;
  photo: string;
}

interface Service {
  id: string;
  key: string;
  title: string;
  desc: string;
  points: string[];
  icon: string;
}

interface Milestone {
  id: string;
  year: string;
  description: string;
}

interface FooterData {
  description: string;
  copyright: string;
  legal: {
    rccm: string;
    tax_number: string;
    id_nat: string;
    numero: string;
    inpp: string;
    onem: string;
  };
  contact: {
    phone: string;
    email: string;
    address: string;
  };
}

/* ------------------------------------------------------------------ */
/* Leadership Tab                                                      */
/* ------------------------------------------------------------------ */

function LeadershipTab({ content, upsert, companyId }: { content: Record<string, unknown>; upsert: ReturnType<typeof useUpsertSiteContent>; companyId?: string | null }) {
  const raw = getContentValue(content, "cms", "leadership", []) as Leadership[];
  const [leaders, setLeaders] = useState<Leadership[]>(() =>
    raw.length > 0 ? raw : [
      { id: crypto.randomUUID(), name: "Marcus Reyes", role: "Fondateur et PDG", initials: "MR", photo: "" },
    ]
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addLeader = () => {
    const id = crypto.randomUUID();
    setLeaders([...leaders, { id, name: "", role: "", initials: "", photo: "" }]);
    setExpandedId(id);
  };

  const updateLeader = (id: string, field: keyof Leadership, value: string) => {
    setLeaders(leaders.map((l) => l.id === id ? { ...l, [field]: value } : l));
  };

  const removeLeader = (id: string) => {
    setLeaders(leaders.filter((l) => l.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const save = async () => {
    await upsert.mutateAsync({ section: "cms", key: "leadership", value: leaders, companyId });
    toast.success("Direction enregistrée !");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Direction / Leadership</h3>
        <Button size="sm" onClick={addLeader}><Plus className="mr-2 h-3.5 w-3.5" /> Ajouter</Button>
      </div>
      {leaders.map((l) => (
        <Card key={l.id}>
          <CardHeader
            className="cursor-pointer select-none py-3"
            onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">{l.name || "Nouveau directeur"}</CardTitle>
                {l.role && <Badge variant="outline" className="text-xs">{l.role}</Badge>}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); removeLeader(l.id); }}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
                {expandedId === l.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
          {expandedId === l.id && (
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Nom</Label>
                  <Input value={l.name} onChange={(e) => updateLeader(l.id, "name", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Fonction</Label>
                  <Input value={l.role} onChange={(e) => updateLeader(l.id, "role", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Initiales</Label>
                  <Input value={l.initials} onChange={(e) => updateLeader(l.id, "initials", e.target.value.toUpperCase().slice(0, 2))} className="mt-1" maxLength={2} />
                </div>
              </div>
              <ImageUpload
                value={l.photo}
                onChange={(url) => updateLeader(l.id, "photo", url)}
                companyId={companyId}
                folder="leadership"
                label="Photo"
              />
            </CardContent>
          )}
        </Card>
      ))}
      <Button onClick={save} disabled={upsert.isPending} className="gap-2">
        <Save className="h-4 w-4" /> {upsert.isPending ? "Enregistrement..." : "Enregistrer la direction"}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Services Tab                                                        */
/* ------------------------------------------------------------------ */

function ServicesTab({ content, upsert, companyId }: { content: Record<string, unknown>; upsert: ReturnType<typeof useUpsertSiteContent>; companyId?: string | null }) {
  const raw = getContentValue(content, "cms", "services", []) as Service[];
  const [services, setServices] = useState<Service[]>(() =>
    raw.length > 0 ? raw : []
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addService = () => {
    const id = crypto.randomUUID();
    setServices([...services, { id, key: "", title: "", desc: "", points: ["", "", "", ""], icon: "building" }]);
    setExpandedId(id);
  };

  const updateService = (id: string, field: keyof Service, value: unknown) => {
    setServices(services.map((s) => s.id === id ? { ...s, [field]: value } : s));
  };

  const updatePoint = (id: string, index: number, value: string) => {
    setServices(services.map((s) => {
      if (s.id !== id) return s;
      const points = [...s.points];
      points[index] = value;
      return { ...s, points };
    }));
  };

  const addPoint = (id: string) => {
    setServices(services.map((s) => s.id === id ? { ...s, points: [...s.points, ""] } : s));
  };

  const removePoint = (id: string, index: number) => {
    setServices(services.map((s) => {
      if (s.id !== id) return s;
      return { ...s, points: s.points.filter((_, i) => i !== index) };
    }));
  };

  const removeService = (id: string) => {
    setServices(services.filter((s) => s.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const save = async () => {
    await upsert.mutateAsync({ section: "cms", key: "services", value: services, companyId });
    toast.success("Services enregistrés !");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Services</h3>
        <Button size="sm" onClick={addService}><Plus className="mr-2 h-3.5 w-3.5" /> Ajouter un service</Button>
      </div>
      {services.map((s) => (
        <Card key={s.id}>
          <CardHeader
            className="cursor-pointer select-none py-3"
            onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">{s.title || "Nouveau service"}</CardTitle>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); removeService(s.id); }}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
                {expandedId === s.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
          {expandedId === s.id && (
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Titre</Label>
                  <Input value={s.title} onChange={(e) => updateService(s.id, "title", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Clé (pour i18n)</Label>
                  <Input value={s.key} onChange={(e) => updateService(s.id, "key", e.target.value)} className="mt-1" placeholder="e.g. commercial" />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={s.desc} onChange={(e) => updateService(s.id, "desc", e.target.value)} className="mt-1" rows={2} />
              </div>
              <div>
                <Label>Points à puces</Label>
                <div className="mt-2 space-y-2">
                  {s.points.map((point, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={point}
                        onChange={(e) => updatePoint(s.id, i, e.target.value)}
                        placeholder={`Point ${i + 1}`}
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removePoint(s.id, i)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addPoint(s.id)}>
                    <Plus className="mr-2 h-3 w-3" /> Ajouter un point
                  </Button>
                </div>
              </div>
              <ImageUpload
                value={s.icon}
                onChange={(url) => updateService(s.id, "icon", url)}
                companyId={companyId}
                folder="services"
                label="Image du service"
              />
            </CardContent>
          )}
        </Card>
      ))}
      <Button onClick={save} disabled={upsert.isPending} className="gap-2">
        <Save className="h-4 w-4" /> {upsert.isPending ? "Enregistrement..." : "Enregistrer les services"}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Milestones Tab                                                      */
/* ------------------------------------------------------------------ */

function MilestonesTab({ content, upsert, companyId }: { content: Record<string, unknown>; upsert: ReturnType<typeof useUpsertSiteContent>; companyId?: string | null }) {
  const raw = getContentValue(content, "cms", "milestones", []) as Milestone[];
  const [milestones, setMilestones] = useState<Milestone[]>(() =>
    raw.length > 0 ? raw : [
      { id: crypto.randomUUID(), year: "1998", description: "Fondée comme équipe de charpentiers résidentiels de 4 personnes." },
    ]
  );

  const addMilestone = () => {
    setMilestones([...milestones, { id: crypto.randomUUID(), year: "", description: "" }]);
  };

  const updateMilestone = (id: string, field: keyof Milestone, value: string) => {
    setMilestones(milestones.map((m) => m.id === id ? { ...m, [field]: value } : m));
  };

  const removeMilestone = (id: string) => {
    setMilestones(milestones.filter((m) => m.id !== id));
  };

  const save = async () => {
    await upsert.mutateAsync({ section: "cms", key: "milestones", value: milestones, companyId });
    toast.success("Étapes enregistrées !");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Étapes</h3>
        <Button size="sm" onClick={addMilestone}><Plus className="mr-2 h-3.5 w-3.5" /> Ajouter une étape</Button>
      </div>
      {milestones.map((m) => (
        <Card key={m.id}>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={m.year}
                  onChange={(e) => updateMilestone(m.id, "year", e.target.value)}
                  className="w-20"
                  placeholder="Année"
                />
              </div>
              <Input
                value={m.description}
                onChange={(e) => updateMilestone(m.id, "description", e.target.value)}
                className="flex-1"
                placeholder="Description de l'étape"
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeMilestone(m.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button onClick={save} disabled={upsert.isPending} className="gap-2">
        <Save className="h-4 w-4" /> {upsert.isPending ? "Enregistrement..." : "Enregistrer les étapes"}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Footer Tab                                                          */
/* ------------------------------------------------------------------ */

function FooterTab({ content, upsert, companyId }: { content: Record<string, unknown>; upsert: ReturnType<typeof useUpsertSiteContent>; companyId?: string | null }) {
  const raw = getContentValue(content, "cms", "footer", {}) as Partial<FooterData>;
  const [data, setData] = useState<FooterData>({
    description: (raw.description as string) || "Entrepreneur général offrant des services complets pour des projets commerciaux, résidentiels, industriels et d'infrastructure.",
    copyright: (raw.copyright as string) || "© 2024 Scer-L/Construct Sarl. Tous droits réservés.",
    legal: {
      rccm: (raw.legal as any)?.rccm || "CD/KIS/RCCM/21.8-00068",
      tax_number: (raw.legal as any)?.tax_number || "A2213934W",
      id_nat: (raw.legal as any)?.id_nat || "25-F4200-N84176G",
      numero: (raw.legal as any)?.numero || "1015361000",
      inpp: (raw.legal as any)?.inpp || "N° DG/DF/DIREC/GU/7022/2021",
      onem: (raw.legal as any)?.onem || "060255A21",
    },
    contact: {
      phone: (raw.contact as any)?.phone || "+1 (555) 240-8800",
      email: (raw.contact as any)?.email || "hello@buildflow.co",
      address: (raw.contact as any)?.address || "240 Riverside Ave, Suite 1100",
    },
  });

  const updateLegal = (field: keyof FooterData["legal"], value: string) => {
    setData({ ...data, legal: { ...data.legal, [field]: value } });
  };

  const updateContact = (field: keyof FooterData["contact"], value: string) => {
    setData({ ...data, contact: { ...data.contact, [field]: value } });
  };

  const save = async () => {
    await upsert.mutateAsync({ section: "cms", key: "footer", value: data, companyId });
    toast.success("Pied de page enregistré !");
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Contenu du pied de page</h3>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm">Description</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} rows={3} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm">Copyright</CardTitle></CardHeader>
        <CardContent>
          <Input value={data.copyright} onChange={(e) => setData({ ...data, copyright: e.target.value })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm">Téléphone</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Téléphone</Label><Input value={data.contact.phone} onChange={(e) => updateContact("phone", e.target.value)} className="mt-1" /></div>
          <div><Label>E-mail</Label><Input value={data.contact.email} onChange={(e) => updateContact("email", e.target.value)} className="mt-1" /></div>
          <div><Label>Adresse</Label><Input value={data.contact.address} onChange={(e) => updateContact("address", e.target.value)} className="mt-1" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm">Informations légales</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>RCCM</Label><Input value={data.legal.rccm} onChange={(e) => updateLegal("rccm", e.target.value)} className="mt-1" /></div>
          <div><Label>Numéro Impôt</Label><Input value={data.legal.tax_number} onChange={(e) => updateLegal("tax_number", e.target.value)} className="mt-1" /></div>
          <div><Label>ID NAT</Label><Input value={data.legal.id_nat} onChange={(e) => updateLegal("id_nat", e.target.value)} className="mt-1" /></div>
          <div><Label>NUMERO</Label><Input value={data.legal.numero} onChange={(e) => updateLegal("numero", e.target.value)} className="mt-1" /></div>
          <div><Label>Certificat INPP</Label><Input value={data.legal.inpp} onChange={(e) => updateLegal("inpp", e.target.value)} className="mt-1" /></div>
          <div><Label>ONEM</Label><Input value={data.legal.onem} onChange={(e) => updateLegal("onem", e.target.value)} className="mt-1" /></div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={upsert.isPending} className="gap-2">
        <Save className="h-4 w-4" /> {upsert.isPending ? "Enregistrement..." : "Enregistrer le pied de page"}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main CMS Page                                                       */
/* ------------------------------------------------------------------ */

function CMSPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { data: content, isLoading } = useSiteContent(profile?.company_id);
  const upsert = useUpsertSiteContent();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
          <LayoutTemplate className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CMS — Éditeur de contenu</h1>
          <p className="text-sm text-muted-foreground">
            Gérez le contenu de votre site web
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="leadership" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="leadership" className="gap-2">
              <Users className="h-4 w-4" /> Direction
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2">
              <FolderKanban className="h-4 w-4" /> Projets
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2">
              <Wrench className="h-4 w-4" /> Services
            </TabsTrigger>
            <TabsTrigger value="milestones" className="gap-2">
              <Milestone className="h-4 w-4" /> Étapes
            </TabsTrigger>
            <TabsTrigger value="footer" className="gap-2">
              <LayoutTemplate className="h-4 w-4" /> Footer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leadership">
            <LeadershipTab content={content ?? {}} upsert={upsert} companyId={profile?.company_id} />
          </TabsContent>
          <TabsContent value="projects">
            <ProjectsEditor content={content ?? {}} upsert={upsert} companyId={profile?.company_id} />
          </TabsContent>
          <TabsContent value="services">
            <ServicesTab content={content ?? {}} upsert={upsert} companyId={profile?.company_id} />
          </TabsContent>
          <TabsContent value="milestones">
            <MilestonesTab content={content ?? {}} upsert={upsert} companyId={profile?.company_id} />
          </TabsContent>
          <TabsContent value="footer">
            <FooterTab content={content ?? {}} upsert={upsert} companyId={profile?.company_id} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
