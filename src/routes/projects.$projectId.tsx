import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
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

const categoryIcons: Record<string, React.ElementType> = {
  commercial: Building2,
  residential: Home,
  industrial: Factory,
  renovation: Hammer,
  infrastructure: Waves,
};

/* ------------------------------------------------------------------ */
/* Server-side data fetch                                              */
/* ------------------------------------------------------------------ */

async function fetchSiteContent() {
  const { data, error } = await supabase.from("site_content").select("section, key, value, company_id");
  if (error) throw error;
  const rows = (data ?? []) as { section: string; key: string; value: unknown; company_id: string | null }[];
  rows.sort((a, b) => (a.company_id ? 1 : 0) - (b.company_id ? 1 : 0));
  const map: Record<string, unknown> = {};
  for (const row of rows) {
    map[`${row.section}.${row.key}`] = row.value;
  }
  return map;
}

/* ------------------------------------------------------------------ */
/* Route                                                               */
/* ------------------------------------------------------------------ */

export const Route = createFileRoute("/projects/$projectId")({
  loader: async () => ({
    siteContent: await fetchSiteContent(),
  }),
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
  const { siteContent } = Route.useLoaderData();
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  // Resolve project from CMS
  const rawProjects = siteContent?.["cms.projects"];
  const cmsProjects: Project[] | null = Array.isArray(rawProjects)
    ? (rawProjects as Project[])
    : null;
  const allProjects: Project[] =
    cmsProjects ?? [];

  const project = allProjects.find(
    (p) =>
      p.id === projectId ||
      p.title.toLowerCase().replace(/\s+/g, "-") === projectId,
  );

  // Still fetching on the server or client: show a skeleton
  if (!siteContent) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center px-4 py-24">
          <div className="animate-pulse rounded-xl border border-border bg-card p-8 max-w-md text-center">
            <div className="h-8 w-3/4 rounded bg-muted" />
            <div className="mt-4 h-4 w-full rounded bg-muted" />
            <div className="mt-4 h-4 w-5/6 rounded bg-muted" />
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  // CMS loaded but this id doesn't match any project
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
