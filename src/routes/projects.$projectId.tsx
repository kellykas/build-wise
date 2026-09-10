import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteHeader";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Ruler,
  Building2,
  Home,
  Factory,
  Hammer,
  Waves,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePublicSiteContent } from "@/hooks/use-public-site-content";
import { useState } from "react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Project {
  id?: string;
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

const defaultProjects: Project[] = [
  {
    id: "default-1",
    title: "Tour Riverside",
    category: "commercial",
    location: "Centre-ville",
    year: "2024",
    size: "32 étages · 44 500 m²",
    status: "Completed",
    blurb:
      "Tour de bureaux de classe A avec commerces au rez-de-chaussée et 3 niveaux de parking souterrain. Certifié LEED Or.",
    img: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&q=70&auto=format&fit=crop",
  },
  {
    id: "default-2",
    title: "Résidences Maple Heights",
    category: "residential",
    location: "Quartier Nord",
    year: "2023",
    size: "186 unités",
    status: "Completed",
    blurb:
      "Ensemble résidentiel multifamilial à deux tours avec équipements sur le toit, espaces de coworking et parking souterrain.",
    img: "https://images.unsplash.com/photo-1448630360428-65456885c650?w=1200&q=70&auto=format&fit=crop",
  },
  {
    id: "default-3",
    title: "Hub logistique Northgate",
    category: "industrial",
    location: "Zone portuaire",
    year: "2024",
    size: "57 600 m²",
    status: "Completed",
    blurb:
      "Centre de distribution transbordeur avec 84 quais de chargement et connexion ferroviaire.",
    img: "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=1200&q=70&auto=format&fit=crop",
  },
  {
    id: "default-4",
    title: "Hôtel Grand Heritage",
    category: "renovation",
    location: "Vieille ville",
    year: "2023",
    size: "210 chambres",
    status: "Completed",
    blurb:
      "Restauration complète d'un monument de 1924 avec mise aux normes sismiques et systèmes modernisés.",
    img: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&q=70&auto=format&fit=crop",
  },
  {
    id: "default-5",
    title: "Échangeur côtier",
    category: "infrastructure",
    location: "Route côtière 9",
    year: "2022",
    size: "3,9 km",
    status: "Completed",
    blurb:
      "Échangeur à quatre niveaux et doubles structures de pont achevés trois mois avant le calendrier.",
    img: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1200&q=70&auto=format&fit=crop",
  },
  {
    id: "default-6",
    title: "Campus médical Skyline",
    category: "commercial",
    location: "Quartier Ouest",
    year: "2025",
    size: "8 bâtiments · 102 000 m²",
    status: "In progress",
    blurb:
      "Campus médical par phases avec centre chirurgical, bureaux médicaux, parkings et centrale technique.",
    img: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=1200&q=70&auto=format&fit=crop",
  },
  {
    id: "default-7",
    title: "Domaine Oakwood",
    category: "residential",
    location: "Hillview Estates",
    year: "2024",
    size: "1 150 m²",
    status: "Completed",
    blurb:
      "Résidence de luxe contemporaine avec piscine intérieure, cave à vin et galerie pour 6 voitures.",
    img: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=70&auto=format&fit=crop",
  },
  {
    id: "default-8",
    title: "Usine Pioneer",
    category: "industrial",
    location: "Zone industrielle Sud",
    year: "2023",
    size: "31 600 m²",
    status: "Completed",
    blurb:
      "Installation industrielle à grande hauteur avec laboratoires propres et sous-station de 12 MW.",
    img: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=70&auto=format&fit=crop",
  },
  {
    id: "default-9",
    title: "Modernisation de la bibliothèque civique",
    category: "renovation",
    location: "Centre-ville",
    year: "2024",
    size: "7 250 m²",
    status: "In progress",
    blurb:
      "Réutilisation adaptative d'un monument civique du milieu du siècle, restant ouvert au public pendant les travaux.",
    img: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1200&q=70&auto=format&fit=crop",
  },
];

const categoryIcons: Record<string, React.ElementType> = {
  commercial: Building2,
  residential: Home,
  industrial: Factory,
  renovation: Hammer,
  infrastructure: Waves,
};

/* ------------------------------------------------------------------ */
/* Route                                                               */
/* ------------------------------------------------------------------ */

export const Route = createFileRoute("/projects/$projectId")({
  head: () => ({
    meta: [{ title: "Détail du projet — Scer-L/Construct Sarl" }],
  }),
  component: ProjectDetailPage,
});

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const { t } = useTranslation();
  const { data: siteContent } = usePublicSiteContent();
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  // Resolve project from CMS or defaults
  const rawProjects = siteContent?.["cms.projects"];
  const cmsProjects: Project[] | null = Array.isArray(rawProjects)
    ? (rawProjects as Project[])
    : null;
  const allProjects: Project[] =
    cmsProjects !== null
      ? cmsProjects.map((p) => ({ ...p }))
      : defaultProjects;

  const project = allProjects.find(
    (p) =>
      p.id === projectId ||
      p.title.toLowerCase().replace(/\s+/g, "-") === projectId,
  );

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center px-4 py-24 text-center">
          <div>
            <h1 className="text-3xl font-bold">Projet introuvable</h1>
            <p className="mt-3 text-muted-foreground">
              Le projet que vous recherchez n'existe pas ou a été supprimé.
            </p>
            <Link to="/projects">
              <Button variant="outline" className="mt-6">
                <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux projets
              </Button>
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const Icon = categoryIcons[project.category] ?? Building2;
  const allImages = [project.img, ...(project.imgs || [])].filter(Boolean);
  const statusCompleted = project.status === "Completed";
  const categoryLabel = t(`projects_page.${project.category}`, project.category);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Back nav */}
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <Link to="/projects">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> {t("projects_page.back_to_projects", "Retour aux projets")}
            </Button>
          </Link>
        </div>

        {/* Hero image */}
        <section className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl border border-border">
            <img
              src={project.img}
              alt={project.title}
              className="h-[40vh] w-full object-cover md:h-[55vh]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 md:p-10">
              <div className="flex items-center gap-2 text-sm text-white/80">
                <Icon className="h-4 w-4" />
                {categoryLabel}
                <span className="mx-1">·</span>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                    statusCompleted
                      ? "bg-success/90 text-success-foreground"
                      : "bg-accent/90 text-accent-foreground"
                  }`}
                >
                  {statusCompleted
                    ? t("projects_page.filter_completed")
                    : t("projects_page.filter_in_progress")}
                </span>
              </div>
              <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">
                {project.title}
              </h1>
            </div>
          </div>
        </section>

        {/* Meta + description */}
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="grid gap-8 md:grid-cols-[1fr_280px]">
            {/* Left: description */}
            <div>
              <p className="text-lg leading-relaxed text-muted-foreground">
                {project.blurb}
              </p>

              {project.description && (
                <div className="mt-6">
                  <h2 className="text-xl font-semibold">
                    {t("projects_page.detail_description", "Description détaillée")}
                  </h2>
                  <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">
                    {project.description}
                  </p>
                </div>
              )}
            </div>

            {/* Right: info card */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t("projects_page.project_info", "Informations du projet")}
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <div className="text-muted-foreground">
                      {t("projects_page.location_label", "Lieu")}
                    </div>
                    <div className="font-medium">{project.location}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Calendar className="h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <div className="text-muted-foreground">
                      {t("projects_page.year_label", "Année")}
                    </div>
                    <div className="font-medium">{project.year}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Ruler className="h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <div className="text-muted-foreground">
                      {t("projects_page.size_label", "Superficie")}
                    </div>
                    <div className="font-medium">{project.size}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Gallery */}
        {allImages.length > 1 && (
          <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
            <h2 className="mb-5 text-xl font-semibold">
              {t("projects_page.gallery_title", "Galerie photos")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allImages.slice(1).map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setLightboxIdx(idx + 1)}
                  className="group relative overflow-hidden rounded-xl border border-border bg-muted transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <img
                    src={url}
                    alt={`${project.title} — photo ${idx + 2}`}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-5xl px-4 py-14 text-center sm:px-6">
            <h2 className="text-2xl font-bold">
              {t("projects_page.cta_title")}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t("projects_page.cta_subtitle")}
            </p>
            <Link to="/contact" search={{ type: "quote" }}>
              <Button size="lg" className="mt-5">
                {t("projects_page.cta_button")}
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Lightbox */}
      {lightboxIdx !== null && allImages[lightboxIdx] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIdx(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white backdrop-blur transition hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIdx(
                lightboxIdx > 0 ? lightboxIdx - 1 : allImages.length - 1,
              );
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-2xl text-white backdrop-blur transition hover:bg-white/20"
          >
            ‹
          </button>

          <img
            src={allImages[lightboxIdx]}
            alt={`${project.title} — photo ${lightboxIdx + 1}`}
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIdx(
                lightboxIdx < allImages.length - 1 ? lightboxIdx + 1 : 0,
              );
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-2xl text-white backdrop-blur transition hover:bg-white/20"
          >
            ›
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white backdrop-blur">
            {lightboxIdx + 1} / {allImages.length}
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
