import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/marketing/SiteHeader";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — BuildFlow ERP" },
      { name: "description", content: "BuildFlow is built by construction veterans and software engineers to bring world-class ERP to every contractor." },
    ],
  }),
  component: () => (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto max-w-4xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight">About BuildFlow</h1>
        <p className="mt-6 text-lg text-muted-foreground">
          We believe construction deserves software as ambitious as the projects it powers.
          BuildFlow unifies project management, finance, HR, procurement, inventory, equipment
          and document control into a single cloud platform — so leaders can make better decisions,
          faster.
        </p>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {[
            { t: "Our mission", d: "Bring enterprise ERP to every construction company on the planet." },
            { t: "Our team", d: "Engineers, PMs and quantity surveyors from leading global contractors." },
            { t: "Our promise", d: "Modern UX, transparent pricing, world-class support." },
          ].map((b) => (
            <div key={b.t} className="rounded-xl border border-border bg-card p-6">
              <div className="font-semibold">{b.t}</div>
              <p className="mt-2 text-sm text-muted-foreground">{b.d}</p>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  ),
});
