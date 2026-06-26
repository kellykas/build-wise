import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteHeader";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Calendar, Ruler } from "lucide-react";
import { useState } from "react";

type Category = "all" | "commercial" | "residential" | "industrial" | "renovation" | "infrastructure";

const projects: Array<{
  title: string; category: Exclude<Category, "all">; location: string; year: string;
  size: string; status: "Completed" | "In progress"; blurb: string; img: string;
}> = [
  { title: "Riverside Tower", category: "commercial", location: "Downtown Metro", year: "2024", size: "32 floors · 480,000 sqft", status: "Completed",
    blurb: "Class-A office tower with ground-floor retail and 3 levels of underground parking.",
    img: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&q=70&auto=format&fit=crop" },
  { title: "Maple Heights Residences", category: "residential", location: "North District", year: "2023", size: "186 units", status: "Completed",
    blurb: "Two-tower multi-family community with rooftop amenities and underground parking.",
    img: "https://images.unsplash.com/photo-1448630360428-65456885c650?w=1200&q=70&auto=format&fit=crop" },
  { title: "Northgate Logistics Hub", category: "industrial", location: "Port Authority", year: "2024", size: "620,000 sqft", status: "Completed",
    blurb: "Cross-dock distribution centre with 84 loading bays and rail spur connection.",
    img: "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=1200&q=70&auto=format&fit=crop" },
  { title: "The Grand Heritage Hotel", category: "renovation", location: "Old Town", year: "2023", size: "210 rooms", status: "Completed",
    blurb: "Full restoration of a 1924 landmark with seismic upgrades and modernised systems.",
    img: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&q=70&auto=format&fit=crop" },
  { title: "Coastal Highway Interchange", category: "infrastructure", location: "Coastal Route 9", year: "2022", size: "2.4 mile span", status: "Completed",
    blurb: "Four-level interchange and twin bridge structures completed three months ahead of schedule.",
    img: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1200&q=70&auto=format&fit=crop" },
  { title: "Skyline Medical Campus", category: "commercial", location: "Westside", year: "2025", size: "8 buildings · 1.1M sqft", status: "In progress",
    blurb: "Phased medical campus with surgical centre, MOBs, parking deck and central plant.",
    img: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=1200&q=70&auto=format&fit=crop" },
  { title: "Oakwood Custom Estate", category: "residential", location: "Hillview Estates", year: "2024", size: "12,400 sqft", status: "Completed",
    blurb: "Contemporary luxury residence with indoor pool, wine cellar and 6-car gallery.",
    img: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=70&auto=format&fit=crop" },
  { title: "Pioneer Manufacturing Plant", category: "industrial", location: "South Industrial Park", year: "2023", size: "340,000 sqft", status: "Completed",
    blurb: "High-bay manufacturing facility with cleanroom labs and 12 MW substation.",
    img: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=70&auto=format&fit=crop" },
  { title: "Civic Library Modernisation", category: "renovation", location: "City Centre", year: "2024", size: "78,000 sqft", status: "In progress",
    blurb: "Adaptive reuse of a mid-century civic landmark — staying open to the public throughout.",
    img: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1200&q=70&auto=format&fit=crop" },
];

const filters: { key: Category; label: string }[] = [
  { key: "all", label: "All projects" },
  { key: "commercial", label: "Commercial" },
  { key: "residential", label: "Residential" },
  { key: "industrial", label: "Industrial" },
  { key: "renovation", label: "Renovation" },
  { key: "infrastructure", label: "Infrastructure" },
];

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Our Projects — BuildFlow Construction" },
      { name: "description", content: "Featured construction projects: commercial, residential, industrial, infrastructure and heritage restoration." },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const [active, setActive] = useState<Category>("all");
  const list = active === "all" ? projects : projects.filter((p) => p.category === active);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Selected projects</h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              A look at the buildings, homes and infrastructure our crews have delivered. Filter by category — or contact us to discuss a similar build of your own.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setActive(f.key)}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${active === f.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => (
              <article key={p.title} className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-xl">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <img src={p.img} alt={p.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <span className={`absolute right-3 top-3 rounded-md px-2 py-0.5 text-xs font-medium backdrop-blur ${p.status === "Completed" ? "bg-success/85 text-success-foreground" : "bg-accent/85 text-accent-foreground"}`}>
                    {p.status}
                  </span>
                </div>
                <div className="p-5">
                  <div className="text-xs uppercase tracking-wide text-primary">{p.category}</div>
                  <h3 className="mt-1 text-lg font-semibold">{p.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{p.blurb}</p>
                  <div className="mt-4 grid gap-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {p.location}</div>
                    <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {p.year}</div>
                    <div className="flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5" /> {p.size}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6">
            <h2 className="text-3xl font-bold">Inspired by something here?</h2>
            <p className="mt-3 text-muted-foreground">Tell us about your project and we'll share comparable references and a budget range.</p>
            <Link to="/contact" search={{ type: "quote" }}><Button size="lg" className="mt-6">Request a quote <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
