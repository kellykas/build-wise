import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
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
  title: string;
  category: Exclude<Category, "all">;
  location: string;
  year: string;
  size: string;
  status: "Completed" | "In progress";
  blurb: string;
  img: string;
}

const projects: Project[] = [
  {
    title: "Riverside Tower",
    category: "commercial",
    location: "Downtown Metro",
    year: "2024",
    size: "32 floors · 480,000 sqft",
    status: "Completed",
    blurb:
      "Class-A office tower with ground-floor retail and 3 levels of underground parking. LEED Gold certified with full smart-building infrastructure.",
    img: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&q=70&auto=format&fit=crop",
  },
  {
    title: "Maple Heights Residences",
    category: "residential",
    location: "North District",
    year: "2023",
    size: "186 units",
    status: "Completed",
    blurb:
      "Two-tower multi-family community with rooftop amenities, co-working spaces, and underground parking.",
    img: "https://images.unsplash.com/photo-1448630360428-65456885c650?w=1200&q=70&auto=format&fit=crop",
  },
  {
    title: "Northgate Logistics Hub",
    category: "industrial",
    location: "Port Authority",
    year: "2024",
    size: "620,000 sqft",
    status: "Completed",
    blurb:
      "Cross-dock distribution centre with 84 loading bays and rail spur connection.",
    img: "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=1200&q=70&auto=format&fit=crop",
  },
  {
    title: "The Grand Heritage Hotel",
    category: "renovation",
    location: "Old Town",
    year: "2023",
    size: "210 rooms",
    status: "Completed",
    blurb:
      "Full restoration of a 1924 landmark with seismic upgrades and modernised systems.",
    img: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&q=70&auto=format&fit=crop",
  },
  {
    title: "Coastal Highway Interchange",
    category: "infrastructure",
    location: "Coastal Route 9",
    year: "2022",
    size: "2.4 mile span",
    status: "Completed",
    blurb:
      "Four-level interchange and twin bridge structures completed three months ahead of schedule.",
    img: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1200&q=70&auto=format&fit=crop",
  },
  {
    title: "Skyline Medical Campus",
    category: "commercial",
    location: "Westside",
    year: "2025",
    size: "8 buildings · 1.1M sqft",
    status: "In progress",
    blurb:
      "Phased medical campus with surgical centre, MOBs, parking deck and central plant.",
    img: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=1200&q=70&auto=format&fit=crop",
  },
  {
    title: "Oakwood Custom Estate",
    category: "residential",
    location: "Hillview Estates",
    year: "2024",
    size: "12,400 sqft",
    status: "Completed",
    blurb:
      "Contemporary luxury residence with indoor pool, wine cellar and 6-car gallery.",
    img: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=70&auto=format&fit=crop",
  },
  {
    title: "Pioneer Manufacturing Plant",
    category: "industrial",
    location: "South Industrial Park",
    year: "2023",
    size: "340,000 sqft",
    status: "Completed",
    blurb:
      "High-bay manufacturing facility with cleanroom labs and 12 MW substation.",
    img: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=70&auto=format&fit=crop",
  },
  {
    title: "Civic Library Modernisation",
    category: "renovation",
    location: "City Centre",
    year: "2024",
    size: "78,000 sqft",
    status: "In progress",
    blurb:
      "Adaptive reuse of a mid-century civic landmark — staying open to the public throughout construction.",
    img: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1200&q=70&auto=format&fit=crop",
  },
];

/* ------------------------------------------------------------------ */
/* Filter / sort config                                                */
/* ------------------------------------------------------------------ */



/* ------------------------------------------------------------------ */
/* Route definition with search params                                 */
/* ------------------------------------------------------------------ */

export interface ProjectsSearchParams {
  q?: string;
  category?: string;
  status?: string;
  sort?: string;
}

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Our Projects — BuildFlow Construction" },
      {
        name: "description",
        content:
          "Featured construction projects: commercial, residential, industrial, infrastructure and heritage restoration. Filter and explore our portfolio.",
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
  const search = useSearch({ from: "/projects" });
  const navigate = useNavigate({ from: "/projects" });

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
    let list = [...projects];

    // Text search
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

    // Category
    if (category !== "all") {
      list = list.filter((p) => p.category === category);
    }

    // Status
    if (status !== "all") {
      const target = status === "completed" ? "Completed" : "In progress";
      list = list.filter((p) => p.status === target);
    }

    // Sort
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

        {/* ---- Empty state ---- */}
        {filtered.length === 0 && (
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
              to="/projects"
              search={{ q: search.q, category: search.category, status: search.status, sort: search.sort }}
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
                    {featured.status}
                  </span>
                </div>
                <div className="flex flex-col justify-center p-8 md:p-10">
                  <div className="text-xs font-medium uppercase tracking-widest text-primary">
                    Featured · {featured.category}
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
                <article
                  key={p.title}
                  className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-xl"
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
                      {p.status}
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="text-xs uppercase tracking-wide text-primary">
                      {p.category}
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
                </article>
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
