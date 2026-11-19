import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  MapPin,
  Calendar,
  Ruler,
  Search,
  SlidersHorizontal,
  X,
  Building2,
  Home,
  Factory,
  Hammer,
  Waves,
  FolderOpen,
} from "lucide-react";
import { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";

/* ------------------------------------------------------------------ */
/* Types & data                                                        */
/* ------------------------------------------------------------------ */

type Category = "all" | "commercial" | "residential" | "industrial" | "renovation" | "infrastructure";
type Status = "all" | "completed" | "in-progress";
type SortKey = "newest" | "oldest" | "az";

interface Project {
  id?: string;
  title: string;
  category: Exclude<Category, "all">;
  location: string;
  year: string;
  size: string;
  status: "Completed" | "In progress";
  blurb: string;
  description?: string;
  img: string;
  imgs?: string[];
}

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

export interface ProjectsSearchParams {
  q?: string;
  category?: string;
  status?: string;
  sort?: string;
}

export const Route = createFileRoute("/projects/")({
  loader: async () => ({
    siteContent: await fetchSiteContent(),
  }),
  head: () => ({
    meta: [
      { title: "Nos projets — HYCO SARLU" },
      {
        name: "description",
        content:
          "Découvrez nos projets de construction : commerciaux, résidentiels, industriels, d'infrastructure et de restauration patrimoniale.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): ProjectsSearchParams => ({
    q: typeof search.q === "string" ? search.q : "",
    category: typeof search.category === "string" ? search.category : "all",
    status: typeof search.status === "string" ? search.status : "all",
    sort: typeof search.sort === "string" ? search.sort : "newest",
  }),
  component: ProjectsPage,
});

/* ------------------------------------------------------------------ */
/* Page component                                                      */
/* ------------------------------------------------------------------ */

function ProjectsPage() {
  const { t } = useTranslation();
  const search = useSearch({ from: "/projects/" }) as unknown as ProjectsSearchParams;
  const navigate = useNavigate({ from: "/projects/" });
  const { siteContent } = Route.useLoaderData();

  const rawProjects = siteContent?.["cms.projects"];
  const cmsProjects: { id?: string; title: string; category: string; location: string; year: string; size: string; status: string; blurb: string; description?: string; img: string; imgs?: string[] }[] | null = Array.isArray(rawProjects)
    ? (rawProjects as { id?: string; title: string; category: string; location: string; year: string; size: string; status: string; blurb: string; description?: string; img: string; imgs?: string[] }[])
    : null;
  const allProjects: Project[] = cmsProjects !== null
    ? cmsProjects.map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category as Project["category"],
        location: p.location,
        year: p.year,
        size: p.size,
        status: p.status as Project["status"],
        blurb: p.blurb,
        description: p.description,
        img: p.img,
        imgs: p.imgs,
      }))
    : [];

  const categoryFilters: { key: Category; label: string; icon: React.ElementType }[] = [
    { key: "all", label: t("projects_page.all"), icon: SlidersHorizontal },
    { key: "commercial", label: t("projects_page.commercial"), icon: Building2 },
    { key: "residential", label: t("projects_page.residential"), icon: Home },
    { key: "industrial", label: t("projects_page.industrial"), icon: Factory },
    { key: "renovation", label: t("projects_page.renovation"), icon: Hammer },
    { key: "infrastructure", label: t("projects_page.infrastructure"), icon: Waves },
  ];

  const statusFilters: { key: Status; label: string }[] = [
    { key: "all", label: t("projects_page.filter_all") },
    { key: "completed", label: t("projects_page.filter_completed") },
    { key: "in-progress", label: t("projects_page.filter_in_progress") },
  ];

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "newest", label: t("projects_page.sort_newest") },
    { key: "oldest", label: t("projects_page.sort_oldest") },
    { key: "az", label: t("projects_page.sort_az") },
  ];

  const getProjectSlug = (p: Project) => p.id || p.title.toLowerCase().replace(/\s+/g, "-");

  const q = search.q ?? "";
  const category = (search.category ?? "all") as Category;
  const status = (search.status ?? "all") as Status;
  const sort = (search.sort ?? "newest") as SortKey;

  const updateParam = useCallback(
    (key: string, value: string) => {
      navigate({ search: (prev: Record<string, string>) => ({ ...prev, [key]: value }), replace: true });
    },
    [navigate],
  );

  const clearAll = useCallback(() => {
    navigate({ search: { q: "", category: "all", status: "all", sort: "newest" }, replace: true });
  }, [navigate]);

  const isFiltered = q !== "" || category !== "all" || status !== "all" || sort !== "newest";

  /* ---- Filter + sort logic ---- */
  const filtered = useMemo(() => {
    let list = [...allProjects];

    if (q.trim()) {
      const term = q.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(term) ||
          p.blurb.toLowerCase().includes(term) ||
          p.location.toLowerCase().includes(term) ||
          p.category.toLowerCase().includes(term),
      );
    }

    if (category !== "all") {
      list = list.filter((p) => p.category === category);
    }

    if (status !== "all") {
      const target = status === "completed" ? "Completed" : "In progress";
      list = list.filter((p) => p.status === target);
    }

    if (sort === "newest") list.sort((a, b) => Number(b.year) - Number(a.year));
    else if (sort === "oldest") list.sort((a, b) => Number(a.year) - Number(b.year));
    else list.sort((a, b) => a.title.localeCompare(b.title));

    return list;
  }, [q, category, status, sort]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* ---- Hero banner ---- */}
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              {t("projects_page.title")}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              {t("projects_page.subtitle")}
            </p>
          </div>
        </section>

        {/* ---- Filters bar ---- */}
        <section className="sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6">
            {/* Row 1: search + sort */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => updateParam("q", e.target.value)}
                  placeholder={t("projects_page.search")}
                  className="pl-9"
                />
              </div>

              <select
                value={sort}
                onChange={(e) => updateParam("sort", e.target.value)}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                {sortOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>

              {isFiltered && (
                <button
                  onClick={clearAll}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" /> {t("projects_page.clear_filters")}
                </button>
              )}
            </div>

            {/* Row 2: category + status pills */}
            <div className="flex flex-wrap items-center gap-2">
              {categoryFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => updateParam("category", f.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                    category === f.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <f.icon className="h-3 w-3" />
                  {f.label}
                </button>
              ))}

              <span className="mx-1 h-5 w-px bg-border" />

              {statusFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => updateParam("status", f.key)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    status === f.key
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Result count */}
            <p className="text-xs text-muted-foreground">
              {filtered.length} {t("projects_page.projects_suffix")}
              {isFiltered ? t("projects_page.found") : t("projects_page.total")}
            </p>
          </div>
        </section>

        {/* ---- Loading skeleton ---- */}
        {!siteContent && (
          <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
            <div className="animate-pulse rounded-xl border border-border bg-card p-4">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="grid gap-4">
                    <div className="aspect-[4/3] rounded-lg bg-muted" />
                    <div className="space-y-2">
                      <div className="h-3 w-24 rounded bg-muted" />
                      <div className="h-5 w-3/4 rounded bg-muted" />
                      <div className="h-3 w-full rounded bg-muted" />
                      <div className="h-3 w-2/3 rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---- Empty state ---- */}
        {siteContent && filtered.length === 0 && (
          <section className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6">
            <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h2 className="mt-4 text-xl font-semibold">{t("projects_page.no_match")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("projects_page.try_adjusting")}
            </p>
            <Button onClick={clearAll} variant="outline" className="mt-6">
              {t("projects_page.clear_all")}
            </Button>
          </section>
        )}

        {/* ---- Featured hero card ---- */}
        {featured && (
          <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
            <Link
              to="/projects/$projectId"
              params={{ projectId: getProjectSlug(featured) }}
              className="group block overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="grid md:grid-cols-2">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted md:aspect-auto">
                  <img
                    src={featured.img}
                    alt={featured.title}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <span
                    className={`absolute left-4 top-4 rounded-md px-2.5 py-1 text-xs font-semibold backdrop-blur ${
                      featured.status === "Completed"
                        ? "bg-success/90 text-success-foreground"
                        : "bg-accent/90 text-accent-foreground"
                    }`}
                  >
                    {featured.status === "Completed" ? t("projects_page.filter_completed") : t("projects_page.filter_in_progress")}
                  </span>
                </div>
                <div className="flex flex-col justify-center p-8 md:p-10">
                  <div className="text-xs font-medium uppercase tracking-widest text-primary">
                    {t("projects_page.featured")} · {t(`projects_page.${featured.category}`)}
                  </div>
                  <h2 className="mt-3 text-2xl font-bold md:text-3xl">
                    {featured.title}
                  </h2>
                  <p className="mt-3 text-muted-foreground">{featured.blurb}</p>
                  <div className="mt-5 grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" />{" "}
                      {featured.location}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" />{" "}
                      {featured.year}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Ruler className="h-3.5 w-3.5 text-primary" />{" "}
                      {featured.size}
                    </div>
                  </div>
                  <div className="mt-6 inline-flex items-center text-sm font-medium text-primary opacity-0 transition group-hover:opacity-100">
                    {t("projects_page.view_details")} <ArrowRight className="ml-1 h-4 w-4" />
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* ---- Remaining grid ---- */}
        {rest.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((p) => (
                <Link
                  to="/projects/$projectId"
                  params={{ projectId: getProjectSlug(p) }}
                  key={p.title}
                  className="group block overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <img
                      src={p.img}
                      alt={p.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <span
                      className={`absolute right-3 top-3 rounded-md px-2 py-0.5 text-xs font-medium backdrop-blur ${
                        p.status === "Completed"
                          ? "bg-success/85 text-success-foreground"
                          : "bg-accent/85 text-accent-foreground"
                      }`}
                    >
                      {p.status === "Completed" ? t("projects_page.filter_completed") : t("projects_page.filter_in_progress")}
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="text-xs uppercase tracking-wide text-primary">
                      {t(`projects_page.${p.category}`)}
                    </div>
                    <h3 className="mt-1 text-lg font-semibold">{p.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {p.blurb}
                    </p>
                    <div className="mt-4 grid gap-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> {p.location}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" /> {p.year}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Ruler className="h-3.5 w-3.5" /> {p.size}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ---- CTA ---- */}
        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6">
            <h2 className="text-3xl font-bold">{t("projects_page.cta_title")}</h2>
            <p className="mt-3 text-muted-foreground">
              {t("projects_page.cta_subtitle")}
            </p>
            <Link to="/contact" search={{ type: "quote" }}>
              <Button size="lg" className="mt-6">
                {t("projects_page.cta_button")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
