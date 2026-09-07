import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Globe, Save, Plus, Trash2, ChevronDown, ChevronRight,
  Type, AlignLeft, List, Phone, Mail, MapPin, Clock,
  FileText, Award, MessageSquare, Star, Image,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  useSiteContent,
  useUpsertSiteContent,
  getContentValue,
} from "@/hooks/use-site-content";

export const Route = createFileRoute("/_authenticated/app/site-editor")({
  component: SiteEditorPage,
});

const SECTIONS = [
  { id: "hero", label: "Section Hero", icon: Type, fields: [
    { key: "badge", label: "Texte du badge", type: "text" },
    { key: "title", label: "Titre principal", type: "text" },
    { key: "subtitle", label: "Sous-titre", type: "textarea" },
    { key: "cta_quote", label: "Bouton 1 (Devis)", type: "text" },
    { key: "cta_projects", label: "Bouton 2 (Projets)", type: "text" },
    { key: "phone_label", label: "Libellé du téléphone", type: "text" },
    { key: "phone_number", label: "Numéro de téléphone", type: "text" },
  ]},
  { id: "stats", label: "Barre de statistiques", icon: Star, fields: [
    { key: "items", label: "Statistiques (tableau JSON)", type: "json_array" },
  ]},
  { id: "services", label: "Services", icon: FileText, fields: [
    { key: "title", label: "Titre de la section", type: "text" },
    { key: "subtitle", label: "Sous-titre de la section", type: "textarea" },
    { key: "view_all", label: "Lien « Voir tout »", type: "text" },
    { key: "items", label: "Services (tableau JSON)", type: "json_array" },
  ]},
  { id: "featured", label: "Projets en vedette", icon: Image, fields: [
    { key: "title", label: "Titre de la section", type: "text" },
    { key: "subtitle", label: "Sous-titre de la section", type: "textarea" },
    { key: "view_all", label: "Lien « Voir tout »", type: "text" },
    { key: "items", label: "Projets (tableau JSON)", type: "json_array" },
  ]},
  { id: "why_us", label: "Pourquoi nous choisir", icon: Award, fields: [
    { key: "title", label: "Titre de la section", type: "text" },
    { key: "subtitle", label: "Sous-titre de la section", type: "textarea" },
    { key: "points", label: "Points (tableau JSON)", type: "json_array" },
  ]},
  { id: "testimonials", label: "Témoignages", icon: MessageSquare, fields: [
    { key: "items", label: "Témoignages (tableau JSON)", type: "json_array" },
  ]},
  { id: "cta", label: "Appel à l'action", icon: Type, fields: [
    { key: "title", label: "Titre de l'appel à l'action", type: "text" },
    { key: "subtitle", label: "Sous-titre", type: "textarea" },
    { key: "quote_btn", label: "Bouton Devis", type: "text" },
    { key: "hi_btn", label: "Bouton Bonjour", type: "text" },
  ]},
  { id: "contact", label: "Coordonnées", icon: Phone, fields: [
    { key: "phone", label: "Téléphone", type: "text" },
    { key: "email", label: "E-mail", type: "text" },
    { key: "address", label: "Adresse", type: "text" },
    { key: "hours", label: "Horaires d'ouverture", type: "text" },
  ]},
  { id: "about", label: "Page À propos", icon: FileText, fields: [
    { key: "title", label: "Titre de la page", type: "text" },
    { key: "mission", label: "Énoncé de mission", type: "textarea" },
    { key: "values", label: "Valeurs (tableau JSON)", type: "json_array" },
  ]},
  { id: "footer", label: "Pied de page", icon: AlignLeft, fields: [
    { key: "description", label: "Description", type: "textarea" },
    { key: "copyright", label: "Texte de copyright", type: "text" },
  ]},
  { id: "certifications", label: "Certifications", icon: Award, fields: [
    { key: "items", label: "Certifications (tableau JSON)", type: "json_array" },
  ]},
  { id: "nav", label: "Navigation", icon: Globe, fields: [
    { key: "home", label: "Accueil", type: "text" },
    { key: "about", label: "À propos", type: "text" },
    { key: "services", label: "Services", type: "text" },
    { key: "projects", label: "Projets", type: "text" },
    { key: "contact", label: "Contact", type: "text" },
    { key: "login", label: "Connexion", type: "text" },
    { key: "dashboard", label: "Tableau de bord", type: "text" },
  ]},
];

function SectionEditor({
  section,
  content,
  upsert,
}: {
  section: typeof SECTIONS[number];
  content: Record<string, unknown>;
  upsert: ReturnType<typeof useUpsertSiteContent>;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const initial = useMemo(() => {
    const out: Record<string, string> = {};
    for (const field of section.fields) {
      const raw = getContentValue(content, section.id, field.key, field.type === "json_array" ? [] : "");
      out[field.key] =
        typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
    }
    return out;
  }, [content, section]);

  const [localValues, setLocalValues] = useState<Record<string, string>>(initial);

  useEffect(() => {
    if (!hasChanges) setLocalValues(initial);
  }, [initial, hasChanges]);

  const handleValueChange = (key: string, value: string) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };


  const handleSave = async () => {
    try {
      for (const field of section.fields) {
        const rawValue = localValues[field.key] ?? "";
        let parsedValue: unknown;

        if (field.type === "json_array") {
          try {
            parsedValue = JSON.parse(rawValue);
          } catch {
            toast.error(`JSON invalide pour « ${field.label} ». Vérifiez le format.`);
            return;
          }
        } else {
          parsedValue = rawValue;
        }

        await upsert.mutateAsync({
          section: section.id,
          key: field.key,
          value: parsedValue,
        });
      }
      setHasChanges(false);
      toast.success(`${section.label} enregistrée !`);
    } catch (err) {
      toast.error(`Échec de l'enregistrement : ${(err as Error).message}`);
    }
  };

  const Icon = section.icon;

  return (
    <Card className="mb-4">
      <CardHeader
        className="cursor-pointer select-none py-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{section.label}</CardTitle>
            {hasChanges && <Badge variant="destructive" className="text-[10px]">Non enregistré</Badge>}
          </div>
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4 pt-0">
          {section.fields.map((field) => {
            return (
              <div key={field.key}>
                <Label className="text-sm font-medium">{field.label}</Label>
                {field.type === "textarea" || field.type === "json_array" ? (
                  <Textarea
                    value={localValues[field.key] ?? ""}
                    onChange={(e) => handleValueChange(field.key, e.target.value)}
                    className="mt-1 font-mono text-sm"
                    rows={field.type === "json_array" ? 6 : 3}
                    placeholder={field.type === "json_array" ? '[{"key": "value"}]' : ""}
                  />
                ) : (
                  <Input
                    value={localValues[field.key] ?? ""}
                    onChange={(e) => handleValueChange(field.key, e.target.value)}
                    className="mt-1"
                  />
                )}
              </div>
            );
          })}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || upsert.isPending}
            size="sm"
            className="gap-2"
          >
            <Save className="h-3.5 w-3.5" />
            {upsert.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

function SiteEditorPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { data: content, isLoading } = useSiteContent(profile?.company_id);
  const upsert = useUpsertSiteContent();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
          <Globe className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("app.nav.settings")} / Éditeur du site</h1>
          <p className="text-sm text-muted-foreground">
            Modifiez tout le contenu public de votre site web
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {SECTIONS.map((section) => (
            <SectionEditor
              key={section.id}
              section={section}
              content={content ?? {}}
              upsert={upsert}
            />
          ))}
        </div>
      )}
    </div>
  );
}
