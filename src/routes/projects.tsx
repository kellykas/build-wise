import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteHeader";

const portfolio = [
  { name: "Riverside Tower", loc: "Downtown · 32 floors", tag: "Commercial" },
  { name: "Greenfield Industrial Park", loc: "North Region · 240 acres", tag: "Industrial" },
  { name: "Lakeside Residences", loc: "East Bay · 180 units", tag: "Residential" },
  { name: "Metro Transit Hub", loc: "Central · Infrastructure", tag: "Public Works" },
  { name: "Coastal Resort Phase II", loc: "Seaside · Hospitality", tag: "Hospitality" },
  { name: "Tech Campus Build-Out", loc: "Innovation District", tag: "Commercial" },
];

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects Portfolio — BuildFlow ERP" },
      { name: "description", content: "A selection of projects delivered by teams using BuildFlow ERP." },
    ],
  }),
  component: () => (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto max-w-7xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight">Project portfolio</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">From towers to transit — a glimpse of work coordinated through BuildFlow.</p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {portfolio.map((p) => (
            <article key={p.name} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="aspect-[16/10] bg-gradient-to-br from-primary/30 via-primary/10 to-accent/20" />
              <div className="p-5">
                <div className="text-xs uppercase tracking-wide text-accent">{p.tag}</div>
                <div className="mt-1 font-semibold">{p.name}</div>
                <div className="text-sm text-muted-foreground">{p.loc}</div>
              </div>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  ),
});
